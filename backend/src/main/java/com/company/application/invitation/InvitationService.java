package com.company.application.invitation;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import com.company.application.authentication.TokenHashing;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.common.util.SecureTokenGenerator;
import com.company.application.email.EmailOutboxService;
import com.company.application.email.EmailTemplateCode;
import com.company.application.password.PasswordPolicy;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

@Service
public class InvitationService {

    private final InvitationTokenRepository invitationTokenRepository;
    private final InvitationProperties invitationProperties;
    private final EmailOutboxService emailOutboxService;
    private final UserRepository userRepository;
    private final UserAccountService userAccountService;
    private final PasswordPolicy passwordPolicy;

    public InvitationService(
            InvitationTokenRepository invitationTokenRepository,
            InvitationProperties invitationProperties,
            EmailOutboxService emailOutboxService,
            UserRepository userRepository,
            UserAccountService userAccountService,
            PasswordPolicy passwordPolicy
    ) {
        this.invitationTokenRepository = invitationTokenRepository;
        this.invitationProperties = invitationProperties;
        this.emailOutboxService = emailOutboxService;
        this.userRepository = userRepository;
        this.userAccountService = userAccountService;
        this.passwordPolicy = passwordPolicy;
    }

    /**
     * Creates (or recreates) an invitation for a pending user. Resend revokes prior unused tokens.
     * Enqueues AES-GCM encrypted outbox email (raw token only in memory until encrypt).
     *
     * @return raw token once for tests; never persist or log it
     */
    @Transactional
    public String createOrResendInvitation(UUID userId) {
        User user = userRepository.findByIdWithProfile(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getStatus() != UserStatus.PENDING_ACTIVATION) {
            throw new InvalidInvitationException("Invitations are only valid for pending users");
        }

        Instant now = Instant.now();
        invitationTokenRepository.revokeActiveForUser(userId, now);

        String rawToken = SecureTokenGenerator.generate(32);
        InvitationToken token = new InvitationToken();
        token.setUserId(userId);
        token.setTokenHash(TokenHashing.sha256Hex(rawToken));
        token.setExpiresAt(now.plus(invitationProperties.getTokenTtl()));
        invitationTokenRepository.save(token);

        String acceptUrl = UriComponentsBuilder
                .fromUri(java.net.URI.create(invitationProperties.getAcceptBaseUrl()))
                .queryParam("token", rawToken)
                .build(true)
                .toUriString();

        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : user.getEmail();
        emailOutboxService.enqueue(
                user.getEmail(),
                EmailTemplateCode.INVITATION,
                "You're invited",
                Map.of("link", acceptUrl, "firstName", firstName)
        );
        return rawToken;
    }

    @Transactional
    public User acceptInvitation(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidInvitationException("Invalid or expired invitation");
        }
        passwordPolicy.validate(newPassword);

        Instant now = Instant.now();
        InvitationToken token = invitationTokenRepository.findByTokenHash(TokenHashing.sha256Hex(rawToken))
                .orElseThrow(() -> new InvalidInvitationException("Invalid or expired invitation"));
        if (!token.isUsable(now)) {
            throw new InvalidInvitationException("Invalid or expired invitation");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new InvalidInvitationException("Invalid or expired invitation"));
        if (user.getStatus() != UserStatus.PENDING_ACTIVATION) {
            throw new InvalidInvitationException("Invalid or expired invitation");
        }

        token.markUsed(now);
        userAccountService.setPassword(user.getId(), newPassword);
        userAccountService.activate(user.getId());
        User activated = userRepository.findById(user.getId()).orElseThrow();
        activated.setEmailVerified(true);
        return activated;
    }
}
