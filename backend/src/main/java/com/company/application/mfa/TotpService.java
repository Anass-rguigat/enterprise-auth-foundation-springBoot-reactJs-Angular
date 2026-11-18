package com.company.application.mfa;

import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.OptionalLong;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

/**
 * RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits) with deterministic replay-safe step selection.
 */
@Service
public class TotpService {

    public static final int STEP_SECONDS = 30;
    public static final int DIGITS = 6;
    private static final int SECRET_BYTES = 20;

    private final SecureRandom secureRandom = new SecureRandom();

    public byte[] generateSecret() {
        byte[] secret = new byte[SECRET_BYTES];
        secureRandom.nextBytes(secret);
        return secret;
    }

    public String encodeSecret(byte[] secret) {
        return Base32.encode(secret);
    }

    public byte[] decodeSecret(String base32) {
        return Base32.decode(base32);
    }

    public long stepAt(Instant instant) {
        return instant.getEpochSecond() / STEP_SECONDS;
    }

    public String codeAt(byte[] secret, long step) {
        return formatCode(hotp(secret, step));
    }

    /**
     * Among steps in {@code [current - window, current + window]} that match {@code code},
     * returns the largest step that is still {@code > lastAcceptedStep} (or any if last is null).
     */
    public OptionalLong findAcceptableStep(
            byte[] secret,
            String code,
            Instant now,
            int window,
            Long lastAcceptedStep
    ) {
        String normalized = normalizeCode(code);
        if (normalized == null) {
            return OptionalLong.empty();
        }
        long current = stepAt(now);
        Long best = null;
        for (long step = current - window; step <= current + window; step++) {
            if (step < 0) {
                continue;
            }
            if (lastAcceptedStep != null && step <= lastAcceptedStep) {
                continue;
            }
            if (constantTimeEquals(formatCode(hotp(secret, step)), normalized)) {
                if (best == null || step > best) {
                    best = step;
                }
            }
        }
        return best == null ? OptionalLong.empty() : OptionalLong.of(best);
    }

    public String otpauthUri(String issuer, String accountName, byte[] secret) {
        String label = urlEncode(issuer) + ":" + urlEncode(accountName);
        return "otpauth://totp/" + label
                + "?secret=" + encodeSecret(secret)
                + "&issuer=" + urlEncode(issuer)
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + STEP_SECONDS;
    }

    static String normalizeCode(String code) {
        if (code == null) {
            return null;
        }
        String digits = code.replace(" ", "").trim();
        if (!digits.matches("\\d{" + DIGITS + "}")) {
            return null;
        }
        return digits;
    }

    private static int hotp(byte[] secret, long step) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(step).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);
            return binary % 1_000_000;
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("TOTP generation failed", ex);
        }
    }

    private static String formatCode(int value) {
        return String.format("%06d", value);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
                .replace("+", "%20");
    }
}
