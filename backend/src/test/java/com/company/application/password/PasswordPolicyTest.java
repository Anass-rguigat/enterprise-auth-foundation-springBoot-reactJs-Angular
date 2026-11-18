package com.company.application.password;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void acceptsStrongPassword() {
        assertThatCode(() -> policy.validate("CorrectHorse1!"))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsShortPassword() {
        assertThatThrownBy(() -> policy.validate("Short1"))
                .isInstanceOf(WeakPasswordException.class);
    }

    @Test
    void rejectsMissingDigit() {
        assertThatThrownBy(() -> policy.validate("CorrectHorseBattery"))
                .isInstanceOf(WeakPasswordException.class);
    }
}
