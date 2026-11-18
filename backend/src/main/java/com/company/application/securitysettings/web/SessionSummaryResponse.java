package com.company.application.securitysettings.web;

import java.time.Instant;
import java.util.UUID;

import com.company.application.authentication.token.TokenFamily;

/**
 * Safe session metadata — never includes JWTs, refresh tokens, or raw hashes.
 */
public record SessionSummaryResponse(
        UUID familyId,
        Instant createdAt,
        Instant lastUsedAt,
        String label,
        boolean current
) {
    public static SessionSummaryResponse from(TokenFamily family, UUID currentFamilyId) {
        return new SessionSummaryResponse(
                family.getId(),
                family.getCreatedAt(),
                family.getLastUsedAt(),
                family.getLabel(),
                currentFamilyId != null && currentFamilyId.equals(family.getId())
        );
    }
}
