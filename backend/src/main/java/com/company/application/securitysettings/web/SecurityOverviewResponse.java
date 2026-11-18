package com.company.application.securitysettings.web;

public record SecurityOverviewResponse(
        boolean emailVerified,
        String pendingEmail,
        boolean mustChangePassword,
        boolean mfaEnabled,
        int activeSessionCount
) {
}
