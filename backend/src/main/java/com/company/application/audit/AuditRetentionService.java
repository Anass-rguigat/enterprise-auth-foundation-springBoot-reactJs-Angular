package com.company.application.audit;

import java.util.Map;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Calls {@code purge_expired_security_audit_logs} as {@code auth_retention}
 * (EXECUTE on SECURITY DEFINER function; no table DELETE grant).
 */
@Service
@ConditionalOnProperty(prefix = "app.audit", name = "retention-enabled", havingValue = "true")
public class AuditRetentionService {

    private static final Logger log = LoggerFactory.getLogger(AuditRetentionService.class);

    private final JdbcTemplate retentionJdbc;
    private final AuditProperties properties;
    private final AuditService auditService;

    public AuditRetentionService(
            @Qualifier("auditRetentionDataSource") DataSource retentionDataSource,
            AuditProperties properties,
            AuditService auditService
    ) {
        this.retentionJdbc = new JdbcTemplate(retentionDataSource);
        this.properties = properties;
        this.auditService = auditService;
    }

    @Scheduled(fixedDelayString = "${app.audit.retention-interval-ms:86400000}")
    public void purgeExpired() {
        int days = properties.getRetentionDays();
        Long deleted = retentionJdbc.queryForObject(
                "SELECT purge_expired_security_audit_logs(?)",
                Long.class,
                days
        );
        long count = deleted == null ? 0L : deleted;
        log.info("Audit retention purged rows={} retentionDays={}", count, days);
        if (count > 0) {
            auditService.record(
                    AuditEventTypes.AUDIT_RETENTION_PURGE,
                    AuditModules.AUDIT,
                    AuditOutcome.INFO,
                    null,
                    null,
                    Map.of("deleted", count, "retentionDays", days)
            );
        }
    }
}
