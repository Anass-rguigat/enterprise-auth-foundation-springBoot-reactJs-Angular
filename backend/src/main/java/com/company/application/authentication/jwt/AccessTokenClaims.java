package com.company.application.authentication.jwt;

import java.time.Instant;
import java.util.UUID;

public record AccessTokenClaims(
        UUID subject,
        UUID jti,
        UUID familyId,
        long tokenVersion,
        Instant issuedAt,
        Instant expiresAt
) {
}
