package com.company.application.mfa;

/**
 * RFC 4648 Base32 (no padding) for TOTP secrets / otpauth URIs.
 */
final class Base32 {

    private static final char[] ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();

    private Base32() {
    }

    static String encode(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                out.append(ALPHABET[(buffer >> (bitsLeft - 5)) & 0x1f]);
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            out.append(ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f]);
        }
        return out.toString();
    }

    static byte[] decode(String encoded) {
        String normalized = encoded.trim().replace("=", "").replace(" ", "").toUpperCase();
        int outputLength = normalized.length() * 5 / 8;
        byte[] out = new byte[outputLength];
        int buffer = 0;
        int bitsLeft = 0;
        int index = 0;
        for (int i = 0; i < normalized.length(); i++) {
            int val = charValue(normalized.charAt(i));
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out[index++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xff);
                bitsLeft -= 8;
            }
        }
        return out;
    }

    private static int charValue(char c) {
        if (c >= 'A' && c <= 'Z') {
            return c - 'A';
        }
        if (c >= '2' && c <= '7') {
            return 26 + (c - '2');
        }
        throw new IllegalArgumentException("Invalid Base32 character: " + c);
    }
}
