package com.company.application.authorization;

import java.util.Map;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.administration.AdminSafeguardService;
import com.company.application.audit.AuditEventTypes;
import com.company.application.audit.AuditModules;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.AuditService;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@Service
public class RoleAssignmentService {

    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final AdminSafeguardService adminSafeguardService;

    public RoleAssignmentService(
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            @Lazy AdminSafeguardService adminSafeguardService
    ) {
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.adminSafeguardService = adminSafeguardService;
    }

    @Transactional(readOnly = true)
    public long countSuperAdmins() {
        return userRoleRepository.countByRoleCode(Role.SUPER_ADMIN);
    }

    @Transactional(readOnly = true)
    public boolean isSuperAdmin(UUID userId) {
        return userRoleRepository.existsByUserIdAndRoleId(userId, Role.SUPER_ADMIN_ID);
    }

    @Transactional
    public void assignSuperAdmin(UUID userId) {
        assignRoleInternal(userId, Role.SUPER_ADMIN);
    }

    /**
     * Ordinary role assignment without actor delegation check (bootstrap / internal).
     * Never grants SUPER_ADMIN — use {@link #grantSuperAdmin}.
     */
    @Transactional
    public void assignRole(UUID targetUserId, String roleCode) {
        if (Role.SUPER_ADMIN.equals(roleCode)) {
            throw new ApplicationException(
                    ErrorCode.FORBIDDEN,
                    "SUPER_ADMIN cannot be granted via USER_ASSIGN_ROLE; use the dedicated grant operation"
            );
        }
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        assignRoleInternal(targetUserId, role);
        auditService.record(
                AuditEventTypes.ROLE_ASSIGN,
                AuditModules.AUTHORIZATION,
                AuditOutcome.SUCCESS,
                null,
                targetUserId,
                Map.of("roleCode", roleCode)
        );
    }

    /**
     * Assign role with lock-before-subset-check ordering:
     * {@code FOR UPDATE} → {@code assertCanAssignRole} → insert → commit (lock held until commit).
     */
    @Transactional
    public void assignRole(UUID actorUserId, UUID targetUserId, String roleCode) {
        if (Role.SUPER_ADMIN.equals(roleCode)) {
            throw new ApplicationException(
                    ErrorCode.FORBIDDEN,
                    "SUPER_ADMIN cannot be granted via USER_ASSIGN_ROLE; use the dedicated grant operation"
            );
        }
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        adminSafeguardService.assertCanAssignRole(actorUserId, role);
        assignRoleInternal(targetUserId, role);
        auditService.record(
                AuditEventTypes.ROLE_ASSIGN,
                AuditModules.AUTHORIZATION,
                AuditOutcome.SUCCESS,
                actorUserId,
                targetUserId,
                Map.of("roleCode", roleCode)
        );
    }

    @Transactional
    public void removeRole(UUID actorUserId, UUID targetUserId, String roleCode) {
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        if (Role.SUPER_ADMIN.equals(roleCode)) {
            if (!isSuperAdmin(actorUserId)) {
                throw new ApplicationException(ErrorCode.FORBIDDEN, "Only SUPER_ADMIN may remove SUPER_ADMIN");
            }
            if (countSuperAdmins() <= 1 && isSuperAdmin(targetUserId)) {
                throw new ApplicationException(ErrorCode.CONFLICT, "Cannot remove the last SUPER_ADMIN");
            }
        }
        if (userRoleRepository.existsByUserIdAndRoleId(targetUserId, role.getId())) {
            userRoleRepository.deleteByUserIdAndRoleId(targetUserId, role.getId());
            bumpAuthzVersion(targetUserId);
            auditService.record(
                    AuditEventTypes.ROLE_REMOVE,
                    AuditModules.AUTHORIZATION,
                    AuditOutcome.SUCCESS,
                    actorUserId,
                    targetUserId,
                    Map.of("roleCode", roleCode)
            );
        }
    }

    /**
     * Dedicated SUPER_ADMIN grant. Actor must already be SUPER_ADMIN (role membership).
     * {@code SECURITY_MANAGE} / {@code USER_ASSIGN_ROLE} alone cannot bypass. Requires password step-up.
     */
    @Transactional
    public void grantSuperAdmin(UUID actorUserId, UUID targetUserId, String actorPassword) {
        if (!isSuperAdmin(actorUserId)) {
            throw new ApplicationException(
                    ErrorCode.FORBIDDEN,
                    "Only an existing SUPER_ADMIN may grant SUPER_ADMIN"
            );
        }
        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Actor not found"));
        if (actor.getPasswordHash() == null
                || !passwordEncoder.matches(actorPassword, actor.getPasswordHash())) {
            throw new ApplicationException(ErrorCode.UNAUTHORIZED, "Step-up authentication failed");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));
        assignRoleInternal(target.getId(), Role.SUPER_ADMIN);
        auditService.record(
                AuditEventTypes.SUPER_ADMIN_GRANT,
                AuditModules.AUTHORIZATION,
                AuditOutcome.SUCCESS,
                actorUserId,
                targetUserId,
                Map.of()
        );
    }

    private void assignRoleInternal(UUID userId, String roleCode) {
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new IllegalStateException(roleCode + " role missing from catalog"));
        assignRoleInternal(userId, role);
    }

    private void assignRoleInternal(UUID userId, Role role) {
        if (userRoleRepository.existsByUserIdAndRoleId(userId, role.getId())) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        UserRole assignment = new UserRole();
        assignment.setUserId(user.getId());
        assignment.setRoleId(role.getId());
        userRoleRepository.save(assignment);
        user.incrementAuthzVersion();
    }

    private void bumpAuthzVersion(UUID userId) {
        userRepository.findById(userId).ifPresent(User::incrementAuthzVersion);
    }
}
