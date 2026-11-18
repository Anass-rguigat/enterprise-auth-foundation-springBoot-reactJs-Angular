package com.company.application.audit;

import javax.sql.DataSource;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "app.audit", name = "retention-enabled", havingValue = "true")
public class AuditRetentionConfig {

    @Bean(name = "auditRetentionDataSource")
    DataSource auditRetentionDataSource(AuditProperties properties) {
        AuditProperties.RetentionDatasource cfg = properties.getRetentionDatasource();
        if (!cfg.isConfigured()) {
            throw new IllegalStateException(
                    "app.audit.retention-enabled=true requires app.audit.retention-datasource url/username/password"
            );
        }
        return DataSourceBuilder.create()
                .url(cfg.getUrl())
                .username(cfg.getUsername())
                .password(cfg.getPassword())
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
