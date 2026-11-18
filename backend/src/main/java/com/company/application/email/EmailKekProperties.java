package com.company.application.email;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.email.outbox")
public class EmailKekProperties {

    private String currentKekId = "local-1";

    /**
     * Map of kek_id → Base64-encoded 32-byte AES key.
     * When empty in local/test, an ephemeral key is generated (not for production).
     */
    private Map<String, String> keks = new LinkedHashMap<>();

    private String mailFrom = "noreply@localhost";

    private int maxAttempts = 8;

    private long pollIntervalMs = 5_000L;

    private int batchSize = 20;

    public String getCurrentKekId() {
        return currentKekId;
    }

    public void setCurrentKekId(String currentKekId) {
        this.currentKekId = currentKekId;
    }

    public Map<String, String> getKeks() {
        return keks;
    }

    public void setKeks(Map<String, String> keks) {
        this.keks = keks;
    }

    public String getMailFrom() {
        return mailFrom;
    }

    public void setMailFrom(String mailFrom) {
        this.mailFrom = mailFrom;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        this.batchSize = batchSize;
    }
}
