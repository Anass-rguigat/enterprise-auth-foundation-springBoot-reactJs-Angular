package com.company.application.mfa;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "mfa_configurations")
public class MfaConfiguration {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "secret_encrypted", nullable = false)
    private byte[] secretEncrypted;

    @Column(nullable = false)
    private byte[] nonce;

    @Column(name = "kek_id", nullable = false, length = 64)
    private String kekId;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "enabled_at")
    private Instant enabledAt;

    @Column(name = "last_totp_step")
    private Long lastTotpStep;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public byte[] getSecretEncrypted() {
        return secretEncrypted;
    }

    public void setSecretEncrypted(byte[] secretEncrypted) {
        this.secretEncrypted = secretEncrypted;
    }

    public byte[] getNonce() {
        return nonce;
    }

    public void setNonce(byte[] nonce) {
        this.nonce = nonce;
    }

    public String getKekId() {
        return kekId;
    }

    public void setKekId(String kekId) {
        this.kekId = kekId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getEnabledAt() {
        return enabledAt;
    }

    public void setEnabledAt(Instant enabledAt) {
        this.enabledAt = enabledAt;
    }

    public Long getLastTotpStep() {
        return lastTotpStep;
    }

    public void setLastTotpStep(Long lastTotpStep) {
        this.lastTotpStep = lastTotpStep;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
