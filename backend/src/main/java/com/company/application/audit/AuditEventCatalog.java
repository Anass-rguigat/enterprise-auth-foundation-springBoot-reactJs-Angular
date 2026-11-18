package com.company.application.audit;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Human-readable labels for audit event codes — for IT / helpdesk screens.
 */
public final class AuditEventCatalog {

    public record EventDefinition(String code, String title, String category, String summaryTemplate) {
    }

    private static final Map<String, EventDefinition> BY_CODE = new LinkedHashMap<>();

    static {
        def(AuditEventTypes.AUTH_LOGIN_SUCCESS, "Signed in", "Sign-in",
                "{actor} signed in successfully.");
        def(AuditEventTypes.AUTH_LOGIN_FAILURE, "Sign-in failed", "Sign-in",
                "Someone tried to sign in as {target} but failed.");
        def(AuditEventTypes.AUTH_LOGIN_MFA_REQUIRED, "MFA challenge started", "Sign-in",
                "{actor} signed in with password and must complete multi-factor authentication.");
        def(AuditEventTypes.AUTH_LOGOUT, "Signed out", "Sign-in",
                "{actor} signed out of this session.");
        def(AuditEventTypes.AUTH_LOGOUT_ALL, "Signed out everywhere", "Sign-in",
                "{actor} signed out of all sessions.");
        def(AuditEventTypes.AUTH_MFA_VERIFY_SUCCESS, "MFA verified", "Sign-in",
                "{actor} completed multi-factor authentication.");
        def(AuditEventTypes.AUTH_MFA_VERIFY_FAILURE, "MFA verification failed", "Sign-in",
                "{actor} failed a multi-factor authentication attempt.");
        def(AuditEventTypes.AUTH_MFA_RECOVERY_SUCCESS, "MFA recovery used", "Sign-in",
                "{actor} signed in using an MFA recovery code.");
        def(AuditEventTypes.AUTH_MFA_RECOVERY_FAILURE, "MFA recovery failed", "Sign-in",
                "{actor} failed an MFA recovery-code attempt.");

        def(AuditEventTypes.MFA_ENROLL_START, "Started MFA setup", "Security",
                "{actor} started setting up multi-factor authentication.");
        def(AuditEventTypes.MFA_ENROLL_CONFIRM, "Enabled MFA", "Security",
                "{actor} finished enabling multi-factor authentication.");
        def(AuditEventTypes.MFA_ENROLL_CANCEL, "Cancelled MFA setup", "Security",
                "{actor} cancelled multi-factor authentication setup.");
        def(AuditEventTypes.MFA_DISABLE, "Disabled MFA", "Security",
                "{actor} turned off multi-factor authentication.");
        def(AuditEventTypes.MFA_RECOVERY_REGENERATE, "Regenerated MFA recovery codes", "Security",
                "{actor} generated new MFA recovery codes.");
        def(AuditEventTypes.MFA_ADMIN_RESET, "Admin reset MFA", "Security",
                "{actor} reset multi-factor authentication for {target}.");

        def(AuditEventTypes.USER_CREATE, "User invited / created", "Users",
                "{actor} created account {target}.");
        def(AuditEventTypes.USER_ACTIVATE, "Login enabled", "Users",
                "{actor} enabled login for {target}.");
        def(AuditEventTypes.USER_SUSPEND, "User suspended", "Users",
                "{actor} suspended {target}.");
        def(AuditEventTypes.USER_DISABLE, "Login disabled", "Users",
                "{actor} disabled login for {target}.");
        def(AuditEventTypes.USER_DELETE, "User deleted", "Users",
                "{actor} deleted {target}.");
        def(AuditEventTypes.USER_RESTORE, "User restored", "Users",
                "{actor} restored {target}.");
        def(AuditEventTypes.USER_FORCE_PASSWORD_RESET, "Password reset sent", "Users",
                "{actor} forced a password reset for {target}.");
        def(AuditEventTypes.USER_REVOKE_SESSIONS, "Sessions revoked", "Users",
                "{actor} signed {target} out of all sessions.");

        def(AuditEventTypes.ROLE_ASSIGN, "Role assigned", "Access",
                "{actor} assigned a role to {target}.");
        def(AuditEventTypes.ROLE_REMOVE, "Role removed", "Access",
                "{actor} removed a role from {target}.");
        def(AuditEventTypes.SUPER_ADMIN_GRANT, "Super admin granted", "Access",
                "{actor} granted SUPER_ADMIN to {target}.");

        def(AuditEventTypes.ROLE_CREATE, "Role created", "Access",
                "{actor} created a role.");
        def(AuditEventTypes.ROLE_UPDATE, "Role updated", "Access",
                "{actor} updated a role.");
        def(AuditEventTypes.ROLE_DELETE, "Role deleted", "Access",
                "{actor} deleted a role.");
        def(AuditEventTypes.ROLE_PERMISSION_ASSIGN, "Permission added to role", "Access",
                "{actor} attached a permission to a role.");
        def(AuditEventTypes.ROLE_PERMISSION_REMOVE, "Permission removed from role", "Access",
                "{actor} removed a permission from a role.");

        def(AuditEventTypes.PASSWORD_CHANGE, "Password changed", "Security",
                "{actor} changed their password.");
        def(AuditEventTypes.PASSWORD_RESET_REQUEST, "Password reset requested", "Security",
                "A password reset was requested for {target}.");
        def(AuditEventTypes.PASSWORD_RESET_COMPLETE, "Password reset completed", "Security",
                "{target} set a new password via reset link.");

        def(AuditEventTypes.AUDIT_RETENTION_PURGE, "Old audit logs purged", "System",
                "Expired audit log rows were purged.");
    }

    private AuditEventCatalog() {
    }

    private static void def(String code, String title, String category, String summaryTemplate) {
        BY_CODE.put(code, new EventDefinition(code, title, category, summaryTemplate));
    }

    public static EventDefinition resolve(String eventType) {
        EventDefinition def = BY_CODE.get(eventType);
        if (def != null) {
            return def;
        }
        String fallback = eventType == null || eventType.isBlank() ? "Unknown activity" : eventType.replace('_', ' ');
        return new EventDefinition(eventType, fallback, "Other", "{actor} performed: " + fallback + ".");
    }

    public static List<EventDefinition> all() {
        return List.copyOf(BY_CODE.values());
    }

    public static String summarize(String eventType, String actorLabel, String targetLabel) {
        EventDefinition def = resolve(eventType);
        String actor = blankTo(actorLabel, "Someone");
        String target = blankTo(targetLabel, "a user");
        return def.summaryTemplate()
                .replace("{actor}", actor)
                .replace("{target}", target);
    }

    public static String outcomeLabel(AuditOutcome outcome) {
        if (outcome == null) {
            return "Unknown";
        }
        return switch (outcome) {
            case SUCCESS -> "Succeeded";
            case FAILURE -> "Failed";
            case DENIED -> "Denied";
            case INFO -> "Recorded";
        };
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
