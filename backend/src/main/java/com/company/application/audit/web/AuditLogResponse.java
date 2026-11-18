package com.company.application.audit.web;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.company.application.audit.AuditClientContext;
import com.company.application.audit.AuditEventCatalog;
import com.company.application.audit.AuditOutcome;
import com.company.application.audit.SecurityAuditLog;

/**
 * IT-facing audit view. Prefer human labels over raw codes/hashes.
 */
public record AuditLogResponse(
        UUID id,
        String eventType,
        String actionTitle,
        String actionSummary,
        String category,
        String module,
        String outcome,
        String outcomeLabel,
        String actorDisplayName,
        String actorEmail,
        String targetDisplayName,
        String targetEmail,
        String clientIp,
        String userAgent,
        String deviceSummary,
        String country,
        String city,
        String locationSummary,
        String macAddress,
        Instant createdAt,
        // retained for advanced tooling; UI should not surface these by default
        UUID actorUserId,
        UUID targetUserId,
        String ipHash,
        String userAgentHash,
        String correlationId,
        Map<String, Object> metadata
) {
    public static AuditLogResponse from(
            SecurityAuditLog log,
            String actorEmail,
            String actorDisplayName,
            String targetEmail,
            String targetDisplayName
    ) {
        AuditEventCatalog.EventDefinition def = AuditEventCatalog.resolve(log.getEventType());
        String actorLabel = firstNonBlank(actorDisplayName, actorEmail);
        String targetLabel = firstNonBlank(targetDisplayName, targetEmail);
        String device = AuditClientContext.summarizeUserAgent(log.getUserAgent());
        String country = log.getCountry();
        String city = log.getCity();
        String location = locationSummary(country, city);
        return new AuditLogResponse(
                log.getId(),
                log.getEventType(),
                def.title(),
                AuditEventCatalog.summarize(log.getEventType(), actorLabel, targetLabel),
                def.category(),
                log.getModule(),
                log.getOutcome() == null ? null : log.getOutcome().name(),
                AuditEventCatalog.outcomeLabel(log.getOutcome()),
                actorDisplayName,
                actorEmail,
                targetDisplayName,
                targetEmail,
                log.getClientIp(),
                log.getUserAgent(),
                device,
                country,
                city,
                location,
                "Not available for web sessions",
                log.getCreatedAt(),
                log.getActorUserId(),
                log.getTargetUserId(),
                log.getIpHash(),
                log.getUserAgentHash(),
                log.getCorrelationId(),
                log.getMetadata()
        );
    }

    private static String locationSummary(String country, String city) {
        if ((country == null || country.isBlank()) && (city == null || city.isBlank())) {
            return "Location not recorded";
        }
        if (country != null && city != null && !city.isBlank() && !country.isBlank()) {
            return city + ", " + country;
        }
        return firstNonBlank(city, country);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return null;
    }
}
