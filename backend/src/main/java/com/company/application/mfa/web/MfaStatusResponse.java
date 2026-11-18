package com.company.application.mfa.web;

public record MfaStatusResponse(
        boolean enabled,
        boolean enrollmentPending,
        long unusedRecoveryCodes
) {
}
