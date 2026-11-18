package com.company.application.authorization;

import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class CorePermissionCatalogContributor implements PermissionCatalogContributor {

    @Override
    public List<PermissionDef> permissions() {
        return List.of(
                def(Permissions.USER_CREATE, "user", "Create users"),
                def(Permissions.USER_READ, "user", "View and list users"),
                def(Permissions.USER_UPDATE, "user", "Update basic non-status user fields"),
                def(Permissions.USER_DELETE, "user", "Soft-delete users"),
                def(Permissions.USER_RESTORE, "user", "Restore soft-deleted users"),
                def(Permissions.USER_ACTIVATE, "user", "Activate or reactivate users"),
                def(Permissions.USER_SUSPEND, "user", "Suspend users"),
                def(Permissions.USER_ASSIGN_ROLE, "user", "Assign or remove non-SUPER_ADMIN roles"),
                def(Permissions.USER_INVITE, "user", "Create or resend invitations"),
                def(Permissions.USER_REVOKE_TOKENS, "user", "Revoke user sessions and token families"),
                def(Permissions.USER_RESET_PASSWORD, "user", "Force password reset for a user"),
                def(Permissions.PROFILE_READ, "profile", "Read user profiles"),
                def(Permissions.PROFILE_UPDATE, "profile", "Update own profile"),
                def(Permissions.PROFILE_ADMIN_UPDATE, "profile", "Update another user's profile"),
                def(Permissions.ROLE_CREATE, "authorization", "Create roles"),
                def(Permissions.ROLE_READ, "authorization", "View roles"),
                def(Permissions.ROLE_UPDATE, "authorization", "Update role metadata"),
                def(Permissions.ROLE_DELETE, "authorization", "Delete non-system roles"),
                def(Permissions.ROLE_ASSIGN_PERMISSION, "authorization", "Attach or detach permissions on roles"),
                def(Permissions.PERMISSION_READ, "authorization", "List permission catalog"),
                def(Permissions.PERMISSION_MANAGE, "authorization", "Manage permission catalog metadata"),
                def(Permissions.MFA_MANAGE, "mfa", "Manage own MFA"),
                def(Permissions.MFA_ADMIN_RESET, "mfa", "Admin reset or disable another user's MFA"),
                def(Permissions.AUDIT_READ, "audit", "Read security audit logs"),
                def(Permissions.SECURITY_MANAGE, "security", "High-risk security administration"),
                def(Permissions.ADMIN_DASHBOARD_ACCESS, "administration", "Access administration APIs")
        );
    }

    private static PermissionDef def(String code, String module, String description) {
        return new PermissionDef(code, module, description);
    }
}
