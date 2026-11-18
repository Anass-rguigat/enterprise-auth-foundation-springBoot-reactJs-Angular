package com.company.application.user;

import java.time.Instant;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.common.util.EmailNormalizer;
import com.company.application.profile.UserProfile;

/**
 * Account lifecycle for users and profiles.
 * Soft-delete and restore never modify role assignments (user_roles in Phase 9+).
 */
@Service
public class UserAccountService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User createPendingUser(CreateUserCommand command) {
        String normalizedEmail = EmailNormalizer.normalize(command.email());
        if (userRepository.existsByEmailNormalized(normalizedEmail)
                || userRepository.existsByPendingEmailNormalized(normalizedEmail)) {
            throw new DuplicateEmailException(normalizedEmail);
        }

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(command.email().trim());
        user.setEmailNormalized(normalizedEmail);
        user.setStatus(UserStatus.PENDING_ACTIVATION);
        user.setEmailVerified(false);
        user.setMustChangePassword(false);
        user.setTokenVersion(0L);
        user.setAuthzVersion(0L);
        user.setFailedLoginCount(0);

        UserProfile profile = new UserProfile();
        profile.setFirstName(requireText(command.firstName(), "firstName"));
        profile.setLastName(requireText(command.lastName(), "lastName"));
        profile.setPhone(blankToNull(command.phone()));
        profile.setPreferredLanguage(blankToNull(command.preferredLanguage()));
        profile.setTimezone(blankToNull(command.timezone()));
        profile.setJobTitle(blankToNull(command.jobTitle()));
        profile.setDepartment(blankToNull(command.department()));
        profile.setOrganization(blankToNull(command.organization()));
        profile.setCity(blankToNull(command.city()));
        profile.setCountry(blankToNull(command.country()));
        profile.setBio(blankToNull(command.bio()));
        user.setProfile(profile);

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getRequired(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    @Transactional
    public User activate(UUID userId) {
        return applyTransition(userId, UserStatus.ACTIVE);
    }

    /**
     * Sets a password hash for an account (invitation accept / bootstrap / tests).
     * Full password policy and notifications arrive in later phases.
     */
    @Transactional
    public User setPassword(UUID userId, String rawPassword) {
        User user = getRequired(userId);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return user;
    }

    @Transactional
    public User requirePasswordChange(UUID userId, boolean required) {
        User user = getRequired(userId);
        user.setMustChangePassword(required);
        return user;
    }

    @Transactional
    public User suspend(UUID userId) {
        return applyTransition(userId, UserStatus.SUSPENDED);
    }

    @Transactional
    public User disable(UUID userId) {
        return applyTransition(userId, UserStatus.DISABLED);
    }

    /**
     * Soft-delete. Keeps profile rows and does not touch role assignments.
     */
    @Transactional
    public User softDelete(UUID userId) {
        User user = applyTransition(userId, UserStatus.DELETED);
        user.setDeletedAt(Instant.now());
        return user;
    }

    /**
     * Restore a soft-deleted account to ACTIVE.
     * Existing role assignments (Phase 9+) remain in place and are therefore restored with the account.
     */
    @Transactional
    public User restore(UUID userId) {
        User user = applyTransition(userId, UserStatus.ACTIVE);
        user.setDeletedAt(null);
        return user;
    }

    @Transactional
    public User beginEmailChange(UUID userId, String newEmail) {
        User user = getRequired(userId);
        String normalized = EmailNormalizer.normalize(newEmail);
        if (normalized.equals(user.getEmailNormalized())) {
            throw new DuplicateEmailException(normalized);
        }
        if (userRepository.existsByEmailNormalized(normalized)
                || userRepository.existsByPendingEmailNormalized(normalized)) {
            throw new DuplicateEmailException(normalized);
        }
        user.setPendingEmail(newEmail.trim());
        user.setPendingEmailNormalized(normalized);
        return user;
    }

    @Transactional
    public User confirmPendingEmail(UUID userId) {
        User user = getRequired(userId);
        if (user.getPendingEmail() == null || user.getPendingEmailNormalized() == null) {
            throw new IllegalStateException("No pending email to confirm for user " + userId);
        }
        user.setEmail(user.getPendingEmail());
        user.setEmailNormalized(user.getPendingEmailNormalized());
        user.setPendingEmail(null);
        user.setPendingEmailNormalized(null);
        user.setEmailVerified(true);
        return user;
    }

    private User applyTransition(UUID userId, UserStatus target) {
        User user = getRequired(userId);
        UserStatus current = user.getStatus();
        if (!current.canTransitionTo(target)) {
            throw new InvalidStatusTransitionException(current, target);
        }
        user.setStatus(target);
        if (target == UserStatus.SUSPENDED
                || target == UserStatus.DISABLED
                || target == UserStatus.DELETED) {
            user.incrementTokenVersion();
        }
        return user;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
