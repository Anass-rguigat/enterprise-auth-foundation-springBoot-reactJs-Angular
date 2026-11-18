package com.company.application.password;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.email.EmailOutboxService;
import com.company.application.email.EmailTemplateCode;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

/**
 * Completes mandatory / voluntary password changes.
 * Always bumps {@code token_version} and revokes all token families so re-login is required.
 */
@Service
public class PasswordChangeService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final EmailOutboxService emailOutboxService;
    private final AuditService auditService;

    public PasswordChangeService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            TokenFamilyRepository tokenFamilyRepository,
            EmailOutboxService emailOutboxService,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.emailOutboxService = emailOutboxService;
        this.auditService = auditService;
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        User user = userRepository.findByIdWithProfile(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new InvalidPasswordException("Current password is incorrect");
        }

        passwordPolicy.validate(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new WeakPasswordException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.incrementTokenVersion();
        tokenFamilyRepository.revokeAllActiveByUserId(user.getId(), Instant.now(), "PASSWORD_CHANGED");

        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : user.getEmail();
        emailOutboxService.enqueue(
                user.getEmail(),
                EmailTemplateCode.PASSWORD_CHANGED,
                "Your password was changed",
                Map.of("firstName", firstName)
        );
        auditService.record(
                AuditEventTypes.PASSWORD_CHANGE,
                AuditModules.PASSWORD,
                AuditOutcome.SUCCESS,
                userId,
                userId,
                Map.of()
        );
    }
}
