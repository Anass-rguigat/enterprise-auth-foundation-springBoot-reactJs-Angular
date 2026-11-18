package com.company.application.administration;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
import com.company.application.authorization.RoleAssignmentService;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.invitation.InvitationService;
import com.company.application.password.PasswordResetService;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserAccountService userAccountService;
    private final AdminSafeguardService adminSafeguardService;
    private final TokenFamilyRepository tokenFamilyRepository;
    private final InvitationService invitationService;
    private final PasswordResetService passwordResetService;
    private final AuditService auditService;
    private final RoleAssignmentService roleAssignmentService;

    public AdminUserService(
            UserRepository userRepository,
            UserAccountService userAccountService,
            AdminSafeguardService adminSafeguardService,
            TokenFamilyRepository tokenFamilyRepository,
            InvitationService invitationService,
            PasswordResetService passwordResetService,
            AuditService auditService,
            RoleAssignmentService roleAssignmentService
    ) {
        this.userRepository = userRepository;
        this.userAccountService = userAccountService;
        this.adminSafeguardService = adminSafeguardService;
        this.tokenFamilyRepository = tokenFamilyRepository;
        this.invitationService = invitationService;
        this.passwordResetService = passwordResetService;
        this.auditService = auditService;
        this.roleAssignmentService = roleAssignmentService;
    }

    /**
     * Creates a pending user, always sends invite email, optionally assigns roles.
     * Admin never sets a password — invite accept verifies email and sets password.
     */
    @Transactional
    public User createUser(UUID actorUserId, CreateUserCommand command, List<String> roleCodes) {
        User user = userAccountService.createPendingUser(command);
        if (roleCodes != null) {
            for (String roleCode : roleCodes) {
                if (roleCode == null || roleCode.isBlank()) {
                    continue;
                }
                if (actorUserId != null) {
                    roleAssignmentService.assignRole(actorUserId, user.getId(), roleCode.trim());
                } else {
                    roleAssignmentService.assignRole(user.getId(), roleCode.trim());
                }
            }
        }
        invitationService.createOrResendInvitation(user.getId());
        auditService.record(
                AuditEventTypes.USER_CREATE,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                actorUserId,
                user.getId(),
                Map.of("sendInvitation", true)
        );
        return userRepository.findByIdWithProfile(user.getId()).orElseThrow();
    }

    /** @deprecated Prefer {@link #createUser(UUID, CreateUserCommand, List)} — invitation is always sent. */
    @Transactional
    public User createUser(CreateUserCommand command, boolean sendInvitation) {
        User user = userAccountService.createPendingUser(command);
        if (sendInvitation) {
            invitationService.createOrResendInvitation(user.getId());
        }
        auditService.record(
                AuditEventTypes.USER_CREATE,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                user.getId(),
                Map.of("sendInvitation", sendInvitation)
        );
        return userRepository.findByIdWithProfile(user.getId()).orElseThrow();
    }

    @Transactional(readOnly = true)
    public Page<User> search(String q, UserStatus status, Pageable pageable) {
        String query = q == null || q.isBlank() ? null : q.trim();
        return userRepository.search(query, status, pageable);
    }

    @Transactional(readOnly = true)
    public User getWithProfile(UUID userId) {
        return userRepository.findByIdWithProfile(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    @Transactional
    public User updateBasics(
            UUID userId,
            String firstName,
            String lastName,
            String phone,
            String preferredLanguage,
            String timezone,
            String jobTitle,
            String department,
            String organization,
            String city,
            String country,
            String bio
    ) {
        User user = getWithProfile(userId);
        if (user.getProfile() == null) {
            throw new ResourceNotFoundException("Profile not found for user: " + userId);
        }
        var profile = user.getProfile();
        if (firstName != null && !firstName.isBlank()) {
            profile.setFirstName(firstName.trim());
        }
        if (lastName != null && !lastName.isBlank()) {
            profile.setLastName(lastName.trim());
        }
        if (phone != null) {
            profile.setPhone(phone.isBlank() ? null : phone.trim());
        }
        if (preferredLanguage != null) {
            profile.setPreferredLanguage(preferredLanguage.isBlank() ? null : preferredLanguage.trim());
        }
        if (timezone != null) {
            profile.setTimezone(timezone.isBlank() ? null : timezone.trim());
        }
        if (jobTitle != null) {
            profile.setJobTitle(jobTitle.isBlank() ? null : jobTitle.trim());
        }
        if (department != null) {
            profile.setDepartment(department.isBlank() ? null : department.trim());
        }
        if (organization != null) {
            profile.setOrganization(organization.isBlank() ? null : organization.trim());
        }
        if (city != null) {
            profile.setCity(city.isBlank() ? null : city.trim());
        }
        if (country != null) {
            profile.setCountry(country.isBlank() ? null : country.trim());
        }
        if (bio != null) {
            profile.setBio(bio.isBlank() ? null : bio.trim());
        }
        return user;
    }

    @Transactional
    public User activate(UUID userId) {
        User user = userAccountService.activate(userId);
        auditService.record(
                AuditEventTypes.USER_ACTIVATE,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
        return user;
    }

    @Transactional
    public User suspend(UUID userId) {
        adminSafeguardService.assertNotLastSuperAdmin(userId, "suspend");
        User user = userAccountService.suspend(userId);
        tokenFamilyRepository.revokeAllActiveByUserId(userId, Instant.now(), "ADMIN_SUSPEND");
        auditService.record(
                AuditEventTypes.USER_SUSPEND,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
        return user;
    }

    @Transactional
    public User disable(UUID userId) {
        adminSafeguardService.assertNotLastSuperAdmin(userId, "disable");
        User user = userAccountService.disable(userId);
        tokenFamilyRepository.revokeAllActiveByUserId(userId, Instant.now(), "ADMIN_DISABLE");
        auditService.record(
                AuditEventTypes.USER_DISABLE,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
        return user;
    }

    @Transactional
    public User softDelete(UUID userId) {
        adminSafeguardService.assertNotLastSuperAdmin(userId, "delete");
        User user = userAccountService.softDelete(userId);
        tokenFamilyRepository.revokeAllActiveByUserId(userId, Instant.now(), "ADMIN_DELETE");
        auditService.record(
                AuditEventTypes.USER_DELETE,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
        return user;
    }

    @Transactional
    public User restore(UUID userId) {
        User user = userAccountService.restore(userId);
        auditService.record(
                AuditEventTypes.USER_RESTORE,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
        return user;
    }

    @Transactional
    public void forcePasswordReset(UUID userId) {
        User user = userAccountService.getRequired(userId);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "Password reset only for ACTIVE users");
        }
        String email = user.getEmail();
        userAccountService.requirePasswordChange(userId, true);
        User managed = userAccountService.getRequired(userId);
        managed.incrementTokenVersion();
        tokenFamilyRepository.revokeAllActiveByUserId(userId, Instant.now(), "ADMIN_FORCE_PASSWORD_RESET");
        passwordResetService.forgotPassword(email);
        auditService.record(
                AuditEventTypes.USER_FORCE_PASSWORD_RESET,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
    }

    @Transactional
    public void revokeAllSessions(UUID userId) {
        User managed = userAccountService.getRequired(userId);
        managed.incrementTokenVersion();
        tokenFamilyRepository.revokeAllActiveByUserId(userId, Instant.now(), "ADMIN_REVOKE_SESSIONS");
        auditService.record(
                AuditEventTypes.USER_REVOKE_SESSIONS,
                AuditModules.ADMINISTRATION,
                AuditOutcome.SUCCESS,
                null,
                userId,
                Map.of()
        );
    }

    @Transactional
    public void revokeSession(UUID userId, UUID familyId) {
        TokenFamily family = tokenFamilyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
        if (!family.getUserId().equals(userId)) {
            throw new ApplicationException(ErrorCode.NOT_FOUND, "Session not found");
        }
        if (!family.isRevoked()) {
            family.revoke("ADMIN_REVOKE_SESSION");
        }
    }
}
