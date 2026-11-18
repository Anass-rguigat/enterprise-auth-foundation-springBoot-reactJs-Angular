package com.company.application.mfa.web;

import java.time.Instant;

public record MfaEnrollmentStartResponse(
        String secretBase32,
        String otpauthUri,
        Instant expiresAt
) {
}
