package com.company.application.mfa;

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
 * AES-GCM for TOTP secrets at rest.
 * AAD = {@code userId|context} (e.g. {@code mfa_configuration} / {@code mfa_enrollment}).
 */
@Service
public class MfaCryptoService {

    private static final Logger log = LoggerFactory.getLogger(MfaCryptoService.class);
    private static final int GCM_TAG_BITS = 128;
    private static final int NONCE_BYTES = 12;
    private static final int KEY_BYTES = 32;

    public static final String CONTEXT_CONFIGURATION = "mfa_configuration";
    public static final String CONTEXT_ENROLLMENT = "mfa_enrollment";

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, SecretKey> keys = new ConcurrentHashMap<>();
    private final String currentKekId;

    public MfaCryptoService(MfaProperties properties) {
        this.currentKekId = resolveKeys(properties.getCrypto());
    }

    public String currentKekId() {
        return currentKekId;
    }

    public record EncryptedSecret(byte[] ciphertext, byte[] nonce, String kekId) {
    }

    public EncryptedSecret encrypt(UUID userId, String context, byte[] plaintext) {
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            secureRandom.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keys.get(currentKekId), new GCMParameterSpec(GCM_TAG_BITS, nonce));
            cipher.updateAAD(aad(userId, context));
            return new EncryptedSecret(cipher.doFinal(plaintext), nonce, currentKekId);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("MFA secret encryption failed", ex);
        }
    }

    public byte[] decrypt(UUID userId, String context, String kekId, byte[] nonce, byte[] ciphertext) {
        SecretKey key = keys.get(kekId);
        if (key == null) {
            throw new IllegalStateException("Unknown MFA kek_id: " + kekId);
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, nonce));
            cipher.updateAAD(aad(userId, context));
            return cipher.doFinal(ciphertext);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("MFA secret decryption failed (tamper or wrong AAD/key)", ex);
        }
    }

    static byte[] aad(UUID userId, String context) {
        return (userId + "|" + context).getBytes(StandardCharsets.UTF_8);
    }

    private String resolveKeys(MfaProperties.Crypto crypto) {
        if (crypto.getKeks() != null) {
            for (Map.Entry<String, String> entry : crypto.getKeks().entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isBlank()) {
                    keys.put(entry.getKey(), decodeKey(entry.getValue()));
                }
            }
        }
        String kekId = crypto.getCurrentKekId();
        if (!keys.containsKey(kekId)) {
            log.warn("No MFA_SECRET_KEK configured for kek_id={}; generating ephemeral AES-256 key (dev/test only)", kekId);
            keys.put(kekId, generateEphemeralKey());
        }
        return kekId;
    }

    private static SecretKey decodeKey(String base64) {
        byte[] raw = Base64.getDecoder().decode(base64);
        if (raw.length != KEY_BYTES) {
            throw new IllegalStateException("MFA KEK must be 32 bytes (Base64-encoded)");
        }
        return new SecretKeySpec(raw, "AES");
    }

    private static SecretKey generateEphemeralKey() {
        try {
            KeyGenerator generator = KeyGenerator.getInstance("AES");
            generator.init(KEY_BYTES * 8);
            return generator.generateKey();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Unable to generate ephemeral MFA KEK", ex);
        }
    }
}
