package com.company.application.common.util;

public final class EmailNormalizer {

    private EmailNormalizer() {
    }

    public static String normalize(String email) {
        if (email == null) {
            throw new IllegalArgumentException("email must not be null");
        }
        String trimmed = email.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("email must not be blank");
        }
        return trimmed.toLowerCase();
    }
}
