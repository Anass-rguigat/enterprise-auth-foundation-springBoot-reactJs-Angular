package com.company.application.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class UserStatusTest {

    @ParameterizedTest
    @CsvSource({
            "PENDING_ACTIVATION, ACTIVE, true",
            "PENDING_ACTIVATION, SUSPENDED, false",
            "PENDING_ACTIVATION, DELETED, false",
            "ACTIVE, SUSPENDED, true",
            "ACTIVE, DISABLED, true",
            "ACTIVE, DELETED, true",
            "ACTIVE, PENDING_ACTIVATION, false",
            "SUSPENDED, ACTIVE, true",
            "SUSPENDED, DELETED, true",
            "SUSPENDED, DISABLED, false",
            "DISABLED, ACTIVE, true",
            "DISABLED, DELETED, true",
            "DISABLED, SUSPENDED, false",
            "DELETED, ACTIVE, true",
            "DELETED, SUSPENDED, false"
    })
    void transitionRules(UserStatus from, UserStatus to, boolean allowed) {
        assertThat(from.canTransitionTo(to)).isEqualTo(allowed);
    }

    @Test
    void onlyActiveAllowsLogin() {
        assertThat(UserStatus.ACTIVE.allowsLogin()).isTrue();
        assertThat(UserStatus.PENDING_ACTIVATION.allowsLogin()).isFalse();
        assertThat(UserStatus.SUSPENDED.allowsLogin()).isFalse();
        assertThat(UserStatus.DISABLED.allowsLogin()).isFalse();
        assertThat(UserStatus.DELETED.allowsLogin()).isFalse();
    }

    @Test
    void securityStatusesRequireTokenVersionBump() {
        assertThat(UserStatus.SUSPENDED.requiresTokenVersionBump()).isTrue();
        assertThat(UserStatus.DISABLED.requiresTokenVersionBump()).isTrue();
        assertThat(UserStatus.DELETED.requiresTokenVersionBump()).isTrue();
        assertThat(UserStatus.ACTIVE.requiresTokenVersionBump()).isFalse();
        assertThat(UserStatus.PENDING_ACTIVATION.requiresTokenVersionBump()).isFalse();
    }
}
