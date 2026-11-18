package com.company.application.authorization;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
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
public class RoleManagementService {

    private static final Pattern ROLE_CODE_PATTERN = Pattern.compile("^[A-Z][A-Z0-9_]{1,63}$");

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final AdminSafeguardService adminSafeguardService;
    private final AuditService auditService;

    public RoleManagementService(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            UserRoleRepository userRoleRepository,
            UserRepository userRepository,
            AdminSafeguardService adminSafeguardService,
            AuditService auditService
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.userRepository = userRepository;
        this.adminSafeguardService = adminSafeguardService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<RoleView> listRoles() {
        List<RoleView> views = new ArrayList<>();
        for (Role role : roleRepository.findAll()) {
            views.add(toView(role));
        }
        views.sort(Comparator.comparing(RoleView::code));
        return views;
    }

    @Transactional(readOnly = true)
    public RoleView getRole(String roleCode) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        return toView(role);
    }

    @Transactional
    public RoleView createRole(UUID actorUserId, String code, String name, String description) {
        return createRole(actorUserId, code, name, description, null);
    }

    @Transactional
    public RoleView createRole(
            UUID actorUserId,
            String code,
            String name,
            String description,
            List<String> permissionCodes
    ) {
        String normalizedCode = requireValidCode(code);
        String normalizedName = requireName(name);
        if (roleRepository.findByCode(normalizedCode).isPresent()) {
            throw new ApplicationException(ErrorCode.CONFLICT, "Role code already exists: " + normalizedCode);
        }
        Role role = new Role();
        role.setCode(normalizedCode);
        role.setName(normalizedName);
        role.setDescription(normalizeDescription(description));
        role.setSystemRole(false);
        roleRepository.save(role);
        if (permissionCodes != null) {
            for (String permissionCode : permissionCodes) {
                if (permissionCode == null || permissionCode.isBlank()) {
                    continue;
                }
                attachPermission(actorUserId, normalizedCode, permissionCode.trim());
            }
        }
        auditService.record(
                AuditEventTypes.ROLE_CREATE,
                AuditModules.AUTHORIZATION,
                AuditOutcome.SUCCESS,
                actorUserId,
                null,
                Map.of("roleCode", normalizedCode)
        );
        return toView(role);
    }

    @Transactional
    public RoleView updateRole(UUID actorUserId, String roleCode, String name, String description) {
        if (name == null && description == null) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "Empty PATCH: provide name and/or description");
        }
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        if (name != null) {
            role.setName(requireName(name));
        }
        if (description != null) {
            role.setDescription(description.isBlank() ? null : description.trim());
        }
        auditService.record(
                AuditEventTypes.ROLE_UPDATE,
                AuditModules.AUTHORIZATION,
                AuditOutcome.SUCCESS,
                actorUserId,
                null,
                Map.of("roleCode", role.getCode())
        );
        return toView(role);
    }

    /**
     * Deletes a custom role. Locks role row, re-checks assignments, deletes.
     * Unexpected FK RESTRICT violations are translated to CONFLICT after the failed unit of work
     * is marked for rollback (flush forces the constraint check inside this method).
     */
    @Transactional
    public void deleteRole(UUID actorUserId, String roleCode) {
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        if (role.isSystemRole() || Role.SUPER_ADMIN.equals(role.getCode())) {
            throw new ApplicationException(ErrorCode.FORBIDDEN, "Cannot delete system role: " + role.getCode());
        }
        long assigned = userRoleRepository.countByRoleId(role.getId());
        if (assigned > 0) {
            throw new ApplicationException(
                    ErrorCode.CONFLICT,
                    "Role is still assigned to users"
            );
        }
        try {
            roleRepository.delete(role);
            roleRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            // TX is rollback-only; rethrow as CONFLICT for GlobalExceptionHandler (409 outside failed work)
            throw new ApplicationException(
                    ErrorCode.CONFLICT,
                    "Role is still assigned to users",
                    ErrorCode.CONFLICT.defaultStatus(),
                    ex
            );
        }
        auditService.record(
                AuditEventTypes.ROLE_DELETE,
                AuditModules.AUTHORIZATION,
                AuditOutcome.SUCCESS,
                actorUserId,
                null,
                Map.of("roleCode", roleCode)
        );
    }

    @Transactional
    public void attachPermission(UUID actorUserId, String roleCode, String permissionCode) {
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        adminSafeguardService.assertRolePermissionMutable(role);
        adminSafeguardService.assertCanGrantPermission(actorUserId, permissionCode);
        Permission permission = permissionRepository.findByCode(permissionCode)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));
        if (!rolePermissionRepository.existsByRoleIdAndPermissionId(role.getId(), permission.getId())) {
            RolePermission link = new RolePermission();
            link.setRoleId(role.getId());
            link.setPermissionId(permission.getId());
            rolePermissionRepository.save(link);
            bumpAuthzForRoleHolders(role.getId());
            auditService.record(
                    AuditEventTypes.ROLE_PERMISSION_ASSIGN,
                    AuditModules.AUTHORIZATION,
                    AuditOutcome.SUCCESS,
                    actorUserId,
                    null,
                    Map.of("roleCode", roleCode, "permissionCode", permissionCode)
            );
        }
    }

    @Transactional
    public void detachPermission(UUID actorUserId, String roleCode, String permissionCode) {
        Role role = roleRepository.findByCodeForUpdate(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleCode));
        adminSafeguardService.assertRolePermissionMutable(role);
        adminSafeguardService.assertCanGrantPermission(actorUserId, permissionCode);
        Permission permission = permissionRepository.findByCode(permissionCode)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));
        int removed = rolePermissionRepository.deleteByRoleIdAndPermissionId(role.getId(), permission.getId());
        if (removed > 0) {
            bumpAuthzForRoleHolders(role.getId());
            auditService.record(
                    AuditEventTypes.ROLE_PERMISSION_REMOVE,
                    AuditModules.AUTHORIZATION,
                    AuditOutcome.SUCCESS,
                    actorUserId,
                    null,
                    Map.of("roleCode", roleCode, "permissionCode", permissionCode)
            );
        }
    }

    private void bumpAuthzForRoleHolders(UUID roleId) {
        for (UUID userId : userRoleRepository.findUserIdsByRoleId(roleId)) {
            userRepository.findById(userId).ifPresent(User::incrementAuthzVersion);
        }
    }

    private RoleView toView(Role role) {
        List<String> codes = permissionRepository.findCodesByRoleId(role.getId());
        long assigned = userRoleRepository.countByRoleId(role.getId());
        return new RoleView(
                role.getCode(),
                role.getName(),
                role.getDescription(),
                role.isSystemRole(),
                role.getCreatedAt(),
                codes,
                assigned
        );
    }

    private static String requireValidCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "code must not be blank");
        }
        String trimmed = code.trim();
        if (!ROLE_CODE_PATTERN.matcher(trimmed).matches()) {
            throw new ApplicationException(
                    ErrorCode.VALIDATION_FAILED,
                    "code must match [A-Z][A-Z0-9_]{1,63}"
            );
        }
        return trimmed;
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "name must not be blank");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 120) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "name must be at most 120 characters");
        }
        return trimmed;
    }

    private static String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        String trimmed = description.trim();
        if (trimmed.length() > 512) {
            throw new ApplicationException(ErrorCode.VALIDATION_FAILED, "description must be at most 512 characters");
        }
        return trimmed;
    }

    public record RoleView(
            String code,
            String name,
            String description,
            boolean systemRole,
            java.time.Instant createdAt,
            List<String> permissionCodes,
            long assignedUserCount
    ) {
    }
}
