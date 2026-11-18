package com.company.application.administration;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.authorization.PermissionQueryService;
import com.company.application.authorization.PermissionRepository;
import com.company.application.authorization.Role;
import com.company.application.authorization.RoleAssignmentService;
import com.company.application.authorization.RoleRepository;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

@Service
public class AdminSafeguardService {

    private final RoleAssignmentService roleAssignmentService;
    private final PermissionQueryService permissionQueryService;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;

    public AdminSafeguardService(
            RoleAssignmentService roleAssignmentService,
            PermissionQueryService permissionQueryService,
            PermissionRepository permissionRepository,
            RoleRepository roleRepository
    ) {
        this.roleAssignmentService = roleAssignmentService;
        this.permissionQueryService = permissionQueryService;
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public void assertNotLastSuperAdmin(UUID userId, String action) {
        if (roleAssignmentService.isSuperAdmin(userId) && roleAssignmentService.countSuperAdmins() <= 1) {
            throw new ApplicationException(
                    ErrorCode.CONFLICT,
                    "Cannot " + action + " the last SUPER_ADMIN"
            );
        }
    }

    /**
     * Delegation: actor may assign a role only if the role's permissions are a subset of the actor's,
     * unless the actor is SUPER_ADMIN.
     * <p>
     * When used from the assign path, the role row must already be locked with {@code FOR UPDATE}
     * in the same transaction (see {@link RoleAssignmentService#assignRole}).
     */
    @Transactional(readOnly = true)
    public void assertCanAssignRole(UUID actorUserId, String roleCode) {
        if (roleAssignmentService.isSuperAdmin(actorUserId)) {
            return;
        }
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ApplicationException(ErrorCode.NOT_FOUND, "Role not found: " + roleCode));
        assertRolePermissionsSubsetOfActor(actorUserId, role.getId());
    }

    /**
     * Same subset rule against an already-loaded (preferably locked) role entity.
     */
    @Transactional(readOnly = true)
    public void assertCanAssignRole(UUID actorUserId, Role lockedRole) {
        if (roleAssignmentService.isSuperAdmin(actorUserId)) {
            return;
        }
        assertRolePermissionsSubsetOfActor(actorUserId, lockedRole.getId());
    }

    /**
     * Actor may grant permission {@code P} onto a custom role only if they hold {@code P},
     * unless they are SUPER_ADMIN.
     */
    @Transactional(readOnly = true)
    public void assertCanGrantPermission(UUID actorUserId, String permissionCode) {
        if (roleAssignmentService.isSuperAdmin(actorUserId)) {
            return;
        }
        Set<String> actorPerms = new HashSet<>(permissionQueryService.findPermissionCodes(actorUserId));
        if (!actorPerms.contains(permissionCode)) {
            throw new ApplicationException(
                    ErrorCode.FORBIDDEN,
                    "Cannot grant a permission you do not hold: " + permissionCode
            );
        }
    }

    /**
     * System roles (including SUPER_ADMIN) have immutable permission sets over HTTP.
     */
    public void assertRolePermissionMutable(Role role) {
        if (role.isSystemRole() || Role.SUPER_ADMIN.equals(role.getCode())) {
            throw new ApplicationException(
                    ErrorCode.FORBIDDEN,
                    "Cannot change permissions on system role: " + role.getCode()
            );
        }
    }

    private void assertRolePermissionsSubsetOfActor(UUID actorUserId, UUID roleId) {
        List<String> rolePerms = permissionRepository.findCodesByRoleId(roleId);
        Set<String> actorPerms = new HashSet<>(permissionQueryService.findPermissionCodes(actorUserId));
        if (!actorPerms.containsAll(rolePerms)) {
            throw new ApplicationException(
                    ErrorCode.FORBIDDEN,
                    "Cannot assign a role whose permissions exceed your own"
            );
        }
    }
}
