package com.company.application.email;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import com.company.application.authentication.TokenHashing;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.common.util.SecureTokenGenerator;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;

@Service
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailVerificationProperties properties;
    private final EmailOutboxService emailOutboxService;
    private final UserRepository userRepository;
    private final UserAccountService userAccountService;

    public EmailVerificationService(
            EmailVerificationTokenRepository tokenRepository,
            EmailVerificationProperties properties,
            EmailOutboxService emailOutboxService,
            UserRepository userRepository,
            UserAccountService userAccountService
    ) {
        this.tokenRepository = tokenRepository;
        this.properties = properties;
        this.emailOutboxService = emailOutboxService;
        this.userRepository = userRepository;
        this.userAccountService = userAccountService;
    }

    @Transactional
    public void startPendingEmailVerification(UUID userId) {
        User user = userRepository.findByIdWithProfile(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.NOT_FOUND, "User not found"));
        if (user.getPendingEmail() == null || user.getPendingEmailNormalized() == null) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "No pending email to verify");
        }

        Instant now = Instant.now();
        tokenRepository.revokeActiveForUser(userId, now);

        String rawToken = SecureTokenGenerator.generate(32);
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUserId(userId);
        token.setTokenHash(TokenHashing.sha256Hex(rawToken));
        token.setEmailNormalized(user.getPendingEmailNormalized());
        token.setExpiresAt(now.plus(properties.getTokenTtl()));
        tokenRepository.save(token);

        String link = UriComponentsBuilder
                .fromUri(java.net.URI.create(properties.getVerifyBaseUrl()))
                .queryParam("token", rawToken)
                .build(true)
                .toUriString();

        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : user.getPendingEmail();
        emailOutboxService.enqueue(
                user.getPendingEmail(),
                EmailTemplateCode.EMAIL_VERIFY,
                "Confirm your email address",
                Map.of("link", link, "firstName", firstName)
        );
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid or expired verification token");
        }
        Instant now = Instant.now();
        EmailVerificationToken token = tokenRepository.findByTokenHash(TokenHashing.sha256Hex(rawToken))
                .orElseThrow(() -> new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid or expired verification token"));

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid or expired verification token"));

        // Idempotent success: link already consumed and email is the verified account email.
        if (token.getUsedAt() != null) {
            if (user.isEmailVerified()
                    && token.getEmailNormalized().equals(user.getEmailNormalized())) {
                return;
            }
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid or expired verification token");
        }

        if (!token.isUseable(now)) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid or expired verification token");
        }
        if (user.getPendingEmailNormalized() == null
                || !user.getPendingEmailNormalized().equals(token.getEmailNormalized())) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Invalid or expired verification token");
        }

        token.markUsed(now);
        userAccountService.confirmPendingEmail(user.getId());
    }
}
