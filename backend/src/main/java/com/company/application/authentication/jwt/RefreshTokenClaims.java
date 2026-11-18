package com.company.application.authentication.jwt;

import java.time.Instant;
import java.util.UUID;

public record RefreshTokenClaims(
        UUID subject,
        UUID jti,
        UUID familyId,
        Instant issuedAt,
        Instant expiresAt
) {
}
