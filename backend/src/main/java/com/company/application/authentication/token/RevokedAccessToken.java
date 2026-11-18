package com.company.application.authentication.token;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "revoked_access_tokens")
public class RevokedAccessToken {

    @Id
    private UUID jti;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "family_id")
    private UUID familyId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at", nullable = false)
    private Instant revokedAt;

    @Column(nullable = false, length = 64)
    private String reason;

    @PrePersist
    void onCreate() {
        if (revokedAt == null) {
            revokedAt = Instant.now();
        }
    }

    public UUID getJti() {
        return jti;
    }

    public void setJti(UUID jti) {
        this.jti = jti;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public void setFamilyId(UUID familyId) {
        this.familyId = familyId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
