package com.company.application.audit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.common.web.CorrelationIdFilter;

/**
 * Append-only audit writer. Uses {@link Propagation#REQUIRES_NEW} so login failures and
 * other rolled-back outer transactions still leave an audit trail.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final SecurityAuditLogRepository repository;

    public AuditService(SecurityAuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            String eventType,
            String module,
            AuditOutcome outcome,
            UUID actorUserId,
            UUID targetUserId,
            String ipAddress,
            String userAgent,
            Map<String, Object> metadata
    ) {
        try {
            SecurityAuditLog entry = new SecurityAuditLog();
            entry.setEventType(eventType);
            entry.setModule(module);
            entry.setOutcome(outcome);
            entry.setActorUserId(actorUserId);
            entry.setTargetUserId(targetUserId);
            entry.setIpHash(hashOptional(ipAddress));
            entry.setUserAgentHash(hashOptional(userAgent));
            entry.setClientIp(blankToNull(ipAddress));
            entry.setUserAgent(AuditClientContext.truncateUa(userAgent));
            AuditClientContext.LocationHint location = AuditClientContext.classifyIp(ipAddress);
            entry.setCountry(location.country());
            entry.setCity(location.city());
            entry.setCorrelationId(MDC.get(CorrelationIdFilter.MDC_KEY));
            entry.setMetadata(metadata == null ? new LinkedHashMap<>() : new LinkedHashMap<>(metadata));
            repository.save(entry);
        } catch (RuntimeException ex) {
            // Never fail the primary flow because audit persistence failed.
            log.error("Failed to persist security audit event_type={}", eventType, ex);
        }
    }

    public void record(
            String eventType,
            String module,
            AuditOutcome outcome,
            UUID actorUserId,
            UUID targetUserId,
            Map<String, Object> metadata
    ) {
        record(eventType, module, outcome, actorUserId, targetUserId, null, null, metadata);
    }

    private static String hashOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            return null;
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
