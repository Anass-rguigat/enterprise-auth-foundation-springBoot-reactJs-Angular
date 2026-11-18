package com.company.application.audit;

/**
 * Stable audit event type codes. Prefer these constants over free-form strings.
 */
public final class AuditEventTypes {

    public static final String AUTH_LOGIN_SUCCESS = "AUTH_LOGIN_SUCCESS";
    public static final String AUTH_LOGIN_FAILURE = "AUTH_LOGIN_FAILURE";
    public static final String AUTH_LOGIN_MFA_REQUIRED = "AUTH_LOGIN_MFA_REQUIRED";
    public static final String AUTH_LOGOUT = "AUTH_LOGOUT";
    public static final String AUTH_LOGOUT_ALL = "AUTH_LOGOUT_ALL";
    public static final String AUTH_MFA_VERIFY_SUCCESS = "AUTH_MFA_VERIFY_SUCCESS";
    public static final String AUTH_MFA_VERIFY_FAILURE = "AUTH_MFA_VERIFY_FAILURE";
    public static final String AUTH_MFA_RECOVERY_SUCCESS = "AUTH_MFA_RECOVERY_SUCCESS";
    public static final String AUTH_MFA_RECOVERY_FAILURE = "AUTH_MFA_RECOVERY_FAILURE";

    public static final String MFA_ENROLL_START = "MFA_ENROLL_START";
    public static final String MFA_ENROLL_CONFIRM = "MFA_ENROLL_CONFIRM";
    public static final String MFA_ENROLL_CANCEL = "MFA_ENROLL_CANCEL";
    public static final String MFA_DISABLE = "MFA_DISABLE";
    public static final String MFA_RECOVERY_REGENERATE = "MFA_RECOVERY_REGENERATE";
    public static final String MFA_ADMIN_RESET = "MFA_ADMIN_RESET";

    public static final String USER_CREATE = "USER_CREATE";
    public static final String USER_ACTIVATE = "USER_ACTIVATE";
    public static final String USER_SUSPEND = "USER_SUSPEND";
    public static final String USER_DISABLE = "USER_DISABLE";
    public static final String USER_DELETE = "USER_DELETE";
    public static final String USER_RESTORE = "USER_RESTORE";
    public static final String USER_FORCE_PASSWORD_RESET = "USER_FORCE_PASSWORD_RESET";
    public static final String USER_REVOKE_SESSIONS = "USER_REVOKE_SESSIONS";

    public static final String ROLE_ASSIGN = "ROLE_ASSIGN";
    public static final String ROLE_REMOVE = "ROLE_REMOVE";
    public static final String SUPER_ADMIN_GRANT = "SUPER_ADMIN_GRANT";

    public static final String ROLE_CREATE = "ROLE_CREATE";
    public static final String ROLE_UPDATE = "ROLE_UPDATE";
    public static final String ROLE_DELETE = "ROLE_DELETE";
    public static final String ROLE_PERMISSION_ASSIGN = "ROLE_PERMISSION_ASSIGN";
    public static final String ROLE_PERMISSION_REMOVE = "ROLE_PERMISSION_REMOVE";

    public static final String PASSWORD_CHANGE = "PASSWORD_CHANGE";
    public static final String PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST";
    public static final String PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE";

    public static final String AUDIT_RETENTION_PURGE = "AUDIT_RETENTION_PURGE";

    private AuditEventTypes() {
    }
}
