package com.company.application.email;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * AES-GCM for sensitive outbox payloads.
 * AAD = {@code outboxId|templateCode|recipientNormalized} — recipient tampering fails decrypt.
 */
@Service
public class OutboxCryptoService {

    private static final Logger log = LoggerFactory.getLogger(OutboxCryptoService.class);
    private static final int GCM_TAG_BITS = 128;
    private static final int NONCE_BYTES = 12;
    private static final int KEY_BYTES = 32;

    private final EmailKekProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, SecretKey> keys = new ConcurrentHashMap<>();
    private final String currentKekId;

    public OutboxCryptoService(EmailKekProperties properties) {
        this.properties = properties;
        this.currentKekId = resolveKeys(properties);
    }

    public String currentKekId() {
        return currentKekId;
    }

    public record EncryptedPayload(byte[] ciphertext, byte[] nonce, String kekId) {
    }

    public EncryptedPayload encrypt(UUID outboxId, String templateCode, String recipientNormalized, byte[] plaintext) {
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            secureRandom.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keys.get(currentKekId), new GCMParameterSpec(GCM_TAG_BITS, nonce));
            cipher.updateAAD(aad(outboxId, templateCode, recipientNormalized));
            byte[] ciphertext = cipher.doFinal(plaintext);
            return new EncryptedPayload(ciphertext, nonce, currentKekId);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Outbox payload encryption failed", ex);
        }
    }

    public byte[] decrypt(
            UUID outboxId,
            String templateCode,
            String recipientNormalized,
            String kekId,
            byte[] nonce,
            byte[] ciphertext
    ) {
        SecretKey key = keys.get(kekId);
        if (key == null) {
            throw new IllegalStateException("Unknown outbox kek_id: " + kekId);
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, nonce));
            cipher.updateAAD(aad(outboxId, templateCode, recipientNormalized));
            return cipher.doFinal(ciphertext);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Outbox payload decryption failed (tamper or wrong AAD/key)", ex);
        }
    }

    static byte[] aad(UUID outboxId, String templateCode, String recipientNormalized) {
        String value = outboxId + "|" + templateCode + "|" + recipientNormalized;
        return value.getBytes(StandardCharsets.UTF_8);
    }

    private String resolveKeys(EmailKekProperties props) {
        if (props.getKeks() != null) {
            for (Map.Entry<String, String> entry : props.getKeks().entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isBlank()) {
                    keys.put(entry.getKey(), decodeKey(entry.getValue()));
                }
            }
        }
        String kekId = props.getCurrentKekId();
        if (!keys.containsKey(kekId)) {
            log.warn("No EMAIL_OUTBOX_KEK configured for kek_id={}; generating ephemeral AES-256 key (dev/test only)", kekId);
            keys.put(kekId, generateEphemeralKey());
        }
        return kekId;
    }

    private static SecretKey decodeKey(String base64) {
        byte[] raw = Base64.getDecoder().decode(base64);
        if (raw.length != KEY_BYTES) {
            throw new IllegalStateException("Outbox KEK must be 32 bytes (Base64-encoded)");
        }
        return new SecretKeySpec(raw, "AES");
    }

    private static SecretKey generateEphemeralKey() {
        try {
            KeyGenerator generator = KeyGenerator.getInstance("AES");
            generator.init(KEY_BYTES * 8);
            return generator.generateKey();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Unable to generate ephemeral outbox KEK", ex);
        }
    }

    /** Test helper: pack ciphertext length for assertions without exposing secrets. */
    public static int ciphertextOverhead() {
        return ByteBuffer.allocate(0).capacity();
    }
}
