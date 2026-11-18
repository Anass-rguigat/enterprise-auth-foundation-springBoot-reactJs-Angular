package com.company.application.email;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.common.util.EmailNormalizer;
import tools.jackson.databind.ObjectMapper;

@Service
public class EmailOutboxService {

    private final EmailOutboxRepository emailOutboxRepository;
    private final OutboxCryptoService outboxCryptoService;
    private final EmailKekProperties emailKekProperties;
    private final ObjectMapper objectMapper;

    public EmailOutboxService(
            EmailOutboxRepository emailOutboxRepository,
            OutboxCryptoService outboxCryptoService,
            EmailKekProperties emailKekProperties,
            ObjectMapper objectMapper
    ) {
        this.emailOutboxRepository = emailOutboxRepository;
        this.outboxCryptoService = outboxCryptoService;
        this.emailKekProperties = emailKekProperties;
        this.objectMapper = objectMapper;
    }

    /**
     * Enqueues an encrypted outbox row in the same transaction as the caller.
     * {@code payload} may contain raw tokens — they exist only in memory until encrypted.
     */
    @Transactional
    public EmailOutbox enqueue(String toAddress, String templateCode, String subject, Map<String, Object> payload) {
        UUID id = UUID.randomUUID();
        String normalized = EmailNormalizer.normalize(toAddress);
        byte[] plaintext;
        try {
            plaintext = objectMapper.writeValueAsBytes(payload);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to serialize outbox payload", ex);
        }

        OutboxCryptoService.EncryptedPayload encrypted =
                outboxCryptoService.encrypt(id, templateCode, normalized, plaintext);

        EmailOutbox row = new EmailOutbox();
        row.setId(id);
        row.setToAddress(toAddress.trim());
        row.setToAddressNormalized(normalized);
        row.setSubject(subject);
        row.setTemplateCode(templateCode);
        row.setPayloadEncrypted(encrypted.ciphertext());
        row.setNonce(encrypted.nonce());
        row.setKekId(encrypted.kekId());
        row.setStatus(EmailOutboxStatus.PENDING);
        row.setAttempts(0);
        return emailOutboxRepository.save(row);
    }

    public String mailFrom() {
        return emailKekProperties.getMailFrom();
    }

    public Map<String, Object> decryptPayload(EmailOutbox row) {
        if (row.getPayloadEncrypted() == null || row.getNonce() == null || row.getKekId() == null) {
            throw new IllegalStateException("Outbox row has no encrypted payload: " + row.getId());
        }
        byte[] plaintext = outboxCryptoService.decrypt(
                row.getId(),
                row.getTemplateCode(),
                row.getToAddressNormalized(),
                row.getKekId(),
                row.getNonce(),
                row.getPayloadEncrypted()
        );
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(plaintext, Map.class);
            return map;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to parse decrypted outbox payload", ex);
        }
    }

    public String renderBody(EmailOutbox row, Map<String, Object> payload) {
        String link = payload.get("link") != null ? payload.get("link").toString() : "";
        String name = payload.get("firstName") != null ? payload.get("firstName").toString() : row.getToAddress();
        return switch (row.getTemplateCode()) {
            case EmailTemplateCode.INVITATION -> """
                    Hello %s,

                    You have been invited to activate your account.
                    Open this link to set your password:

                    %s

                    If you did not expect this email, you can ignore it.
                    """.formatted(name, link);
            case EmailTemplateCode.PASSWORD_RESET -> """
                    Hello %s,

                    A password reset was requested for your account.
                    Open this link to choose a new password:

                    %s

                    If you did not request this, you can ignore this email.
                    """.formatted(name, link);
            case EmailTemplateCode.EMAIL_VERIFY -> """
                    Hello %s,

                    Confirm your new email address by opening this link:

                    %s

                    If you did not request this change, you can ignore this email.
                    """.formatted(name, link);
            case EmailTemplateCode.PASSWORD_CHANGED -> """
                    Hello %s,

                    Your password was changed successfully. If you did not do this, reset your password immediately and contact support.
                    """.formatted(name);
            default -> new String(payload.toString().getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
        };
    }
}
