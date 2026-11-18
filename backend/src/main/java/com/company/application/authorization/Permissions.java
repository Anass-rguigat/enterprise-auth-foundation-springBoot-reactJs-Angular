package com.company.application.authorization;

/**
 * Executable permission codes. Runtime checks must use these constants (or DB rows synced from them).
 * Administrators cannot invent codes unknown to the catalog.
 */
public final class Permissions {

    public static final String USER_CREATE = "USER_CREATE";
    public static final String USER_READ = "USER_READ";
    public static final String USER_UPDATE = "USER_UPDATE";
    public static final String USER_DELETE = "USER_DELETE";
    public static final String USER_RESTORE = "USER_RESTORE";
    public static final String USER_ACTIVATE = "USER_ACTIVATE";
    public static final String USER_SUSPEND = "USER_SUSPEND";
    public static final String USER_ASSIGN_ROLE = "USER_ASSIGN_ROLE";
    public static final String USER_INVITE = "USER_INVITE";
    public static final String USER_REVOKE_TOKENS = "USER_REVOKE_TOKENS";
    public static final String USER_RESET_PASSWORD = "USER_RESET_PASSWORD";

    public static final String PROFILE_READ = "PROFILE_READ";
    public static final String PROFILE_UPDATE = "PROFILE_UPDATE";
    public static final String PROFILE_ADMIN_UPDATE = "PROFILE_ADMIN_UPDATE";

    public static final String ROLE_CREATE = "ROLE_CREATE";
    public static final String ROLE_READ = "ROLE_READ";
    public static final String ROLE_UPDATE = "ROLE_UPDATE";
    public static final String ROLE_DELETE = "ROLE_DELETE";
    public static final String ROLE_ASSIGN_PERMISSION = "ROLE_ASSIGN_PERMISSION";

    public static final String PERMISSION_READ = "PERMISSION_READ";
    public static final String PERMISSION_MANAGE = "PERMISSION_MANAGE";

    public static final String MFA_MANAGE = "MFA_MANAGE";
    public static final String MFA_ADMIN_RESET = "MFA_ADMIN_RESET";

    public static final String AUDIT_READ = "AUDIT_READ";
    public static final String SECURITY_MANAGE = "SECURITY_MANAGE";
    public static final String ADMIN_DASHBOARD_ACCESS = "ADMIN_DASHBOARD_ACCESS";

    private Permissions() {
    }
}
