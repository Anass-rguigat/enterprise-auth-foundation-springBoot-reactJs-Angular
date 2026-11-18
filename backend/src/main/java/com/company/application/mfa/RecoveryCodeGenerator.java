package com.company.application.mfa;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

final class RecoveryCodeGenerator {

    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private RecoveryCodeGenerator() {
    }

    static List<String> generate(int count) {
        List<String> codes = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            codes.add(randomGroup(4) + "-" + randomGroup(4));
        }
        return codes;
    }

    static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace("-", "").replace(" ", "").trim().toUpperCase();
    }

    private static String randomGroup(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }
}
