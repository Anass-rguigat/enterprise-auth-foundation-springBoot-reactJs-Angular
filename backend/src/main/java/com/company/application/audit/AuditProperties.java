package com.company.application.audit;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.audit")
public class AuditProperties {

    /**
     * Retention window in days passed to {@code purge_expired_security_audit_logs}
     * (validated inside the DB function: 30–3650).
     */
    private int retentionDays = 365;

    private boolean retentionEnabled;

    private long retentionIntervalMs = 86_400_000L;

    private RetentionDatasource retentionDatasource = new RetentionDatasource();

    public int getRetentionDays() {
        return retentionDays;
    }

    public void setRetentionDays(int retentionDays) {
        this.retentionDays = retentionDays;
    }

    public boolean isRetentionEnabled() {
        return retentionEnabled;
    }

    public void setRetentionEnabled(boolean retentionEnabled) {
        this.retentionEnabled = retentionEnabled;
    }

    public long getRetentionIntervalMs() {
        return retentionIntervalMs;
    }

    public void setRetentionIntervalMs(long retentionIntervalMs) {
        this.retentionIntervalMs = retentionIntervalMs;
    }

    public RetentionDatasource getRetentionDatasource() {
        return retentionDatasource;
    }

    public void setRetentionDatasource(RetentionDatasource retentionDatasource) {
        this.retentionDatasource = retentionDatasource;
    }

    public static class RetentionDatasource {
        private String url = "";
        private String username = "auth_retention";
        private String password = "";

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public boolean isConfigured() {
            return url != null && !url.isBlank()
                    && username != null && !username.isBlank()
                    && password != null && !password.isBlank();
        }
    }
}
