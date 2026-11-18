package com.company.application.email;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "email_outbox")
public class EmailOutbox {

    @Id
    private UUID id;

    @Column(name = "to_address", nullable = false, length = 320)
    private String toAddress;

    @Column(name = "to_address_normalized", nullable = false, length = 320)
    private String toAddressNormalized;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(name = "template_code", nullable = false, length = 64)
    private String templateCode;

    @Column(name = "payload_encrypted")
    private byte[] payloadEncrypted;

    @Column
    private byte[] nonce;

    @Column(name = "kek_id", length = 64)
    private String kekId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private EmailOutboxStatus status;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "last_error", length = 512)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (status == null) {
            status = EmailOutboxStatus.PENDING;
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (nextAttemptAt == null) {
            nextAttemptAt = createdAt;
        }
    }

    public void clearSensitivePayload() {
        this.payloadEncrypted = null;
        this.nonce = null;
        this.kekId = null;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getToAddress() {
        return toAddress;
    }

    public void setToAddress(String toAddress) {
        this.toAddress = toAddress;
    }

    public String getToAddressNormalized() {
        return toAddressNormalized;
    }

    public void setToAddressNormalized(String toAddressNormalized) {
        this.toAddressNormalized = toAddressNormalized;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public byte[] getPayloadEncrypted() {
        return payloadEncrypted;
    }

    public void setPayloadEncrypted(byte[] payloadEncrypted) {
        this.payloadEncrypted = payloadEncrypted;
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

    public EmailOutboxStatus getStatus() {
        return status;
    }

    public void setStatus(EmailOutboxStatus status) {
        this.status = status;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public Instant getNextAttemptAt() {
        return nextAttemptAt;
    }

    public void setNextAttemptAt(Instant nextAttemptAt) {
        this.nextAttemptAt = nextAttemptAt;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }
}
