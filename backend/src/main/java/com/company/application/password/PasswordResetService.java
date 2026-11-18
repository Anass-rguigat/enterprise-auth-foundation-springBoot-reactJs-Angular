package com.company.application.password;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.authentication.TokenHashing;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.common.util.EmailNormalizer;
import com.company.application.common.util.SecureTokenGenerator;
import com.company.application.email.EmailOutboxService;
import com.company.application.email.EmailTemplateCode;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordResetProperties properties;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final EmailOutboxService emailOutboxService;
    private final AuditService auditService;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordResetProperties properties,
            PasswordPolicy passwordPolicy,
            PasswordEncoder passwordEncoder,
            TokenFamilyRepository tokenFamilyRepository,
            EmailOutboxService emailOutboxService,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.properties = properties;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.emailOutboxService = emailOutboxService;
        this.auditService = auditService;
    }

    /**
     * Enumeration-safe: always succeeds. Email only when an ACTIVE user with a password exists.
     */
    @Transactional
    public void forgotPassword(String email) {
        String normalized = EmailNormalizer.normalize(email);
        Optional<User> maybeUser = userRepository.findByEmailNormalized(normalized);
        if (maybeUser.isEmpty()) {
            return;
        }
        User user = maybeUser.get();
        if (user.getStatus() != UserStatus.ACTIVE || user.getPasswordHash() == null) {
            return;
        }

        Instant now = Instant.now();
        passwordResetTokenRepository.revokeActiveForUser(user.getId(), now);

        String rawToken = SecureTokenGenerator.generate(32);
        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setTokenHash(TokenHashing.sha256Hex(rawToken));
        token.setExpiresAt(now.plus(properties.getTokenTtl()));
        passwordResetTokenRepository.save(token);

        String link = UriComponentsBuilder
                .fromUri(java.net.URI.create(properties.getResetBaseUrl()))
                .queryParam("token", rawToken)
                .build(true)
                .toUriString();

        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : null;
        emailOutboxService.enqueue(
                user.getEmail(),
                EmailTemplateCode.PASSWORD_RESET,
                "Reset your password",
                Map.of(
                        "link", link,
                        "firstName", firstName != null ? firstName : user.getEmail()
                )
        );
        auditService.record(
                AuditEventTypes.PASSWORD_RESET_REQUEST,
                AuditModules.PASSWORD,
                AuditOutcome.SUCCESS,
                user.getId(),
                user.getId(),
                Map.of()
        );
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidPasswordException("Invalid or expired reset token");
        }
        passwordPolicy.validate(newPassword);

        Instant now = Instant.now();
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(TokenHashing.sha256Hex(rawToken))
                .orElseThrow(() -> new InvalidPasswordException("Invalid or expired reset token"));
        if (!token.isUsable(now)) {
            throw new InvalidPasswordException("Invalid or expired reset token");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new InvalidPasswordException("Invalid or expired reset token"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new InvalidPasswordException("Invalid or expired reset token");
        }

        token.markUsed(now);
        passwordResetTokenRepository.revokeActiveForUser(user.getId(), now);

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.incrementTokenVersion();
        tokenFamilyRepository.revokeAllActiveByUserId(user.getId(), now, "PASSWORD_RESET");

        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : user.getEmail();
        emailOutboxService.enqueue(
                user.getEmail(),
                EmailTemplateCode.PASSWORD_CHANGED,
                "Your password was changed",
                Map.of("firstName", firstName)
        );
        auditService.record(
                AuditEventTypes.PASSWORD_RESET_COMPLETE,
                AuditModules.PASSWORD,
                AuditOutcome.SUCCESS,
                user.getId(),
                user.getId(),
                Map.of()
        );
    }
}
