package com.company.application.password;

import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

    public static final int MIN_LENGTH = 12;

    public void validate(String rawPassword) {
        if (rawPassword == null || rawPassword.length() < MIN_LENGTH) {
            throw new WeakPasswordException("Password must be at least " + MIN_LENGTH + " characters");
        }
        boolean hasLetter = rawPassword.chars().anyMatch(Character::isLetter);
        boolean hasDigit = rawPassword.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new WeakPasswordException("Password must contain at least one letter and one digit");
        }
    }
}
