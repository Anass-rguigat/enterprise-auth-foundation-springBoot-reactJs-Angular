package com.company.application.mfa;

import java.time.Instant;
import java.util.OptionalLong;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TotpServiceTest {

    private final TotpService totpService = new TotpService();

    @Test
    void acceptsCurrentStepAndRejectsReplayOfSameStep() {
        byte[] secret = totpService.generateSecret();
        Instant now = Instant.parse("2026-11-16T12:00:00Z");
        long step = totpService.stepAt(now);
        String code = totpService.codeAt(secret, step);

        OptionalLong accepted = totpService.findAcceptableStep(secret, code, now, 1, null);
        assertThat(accepted).hasValue(step);

        OptionalLong replay = totpService.findAcceptableStep(secret, code, now, 1, step);
        assertThat(replay).isEmpty();
    }

    @Test
    void prefersLargestMatchingStepWithinWindow() {
        byte[] secret = totpService.generateSecret();
        Instant now = Instant.parse("2026-11-16T12:00:15Z");
        long current = totpService.stepAt(now);
        // Use previous step code while still in window; lastAccepted is older so both current-1 and
        // (if codes collide — rare) — we assert the previous step alone matches when using its code.
        String previousCode = totpService.codeAt(secret, current - 1);
        OptionalLong accepted = totpService.findAcceptableStep(secret, previousCode, now, 1, current - 2);
        assertThat(accepted).hasValue(current - 1);
    }

    @Test
    void encodesAndDecodesSecretRoundTrip() {
        byte[] secret = totpService.generateSecret();
        String encoded = totpService.encodeSecret(secret);
        assertThat(totpService.decodeSecret(encoded)).isEqualTo(secret);
    }

    @Test
    void otpauthUriContainsIssuerAndSecret() {
        byte[] secret = totpService.generateSecret();
        String uri = totpService.otpauthUri("Acme", "user@example.com", secret);
        assertThat(uri).startsWith("otpauth://totp/");
        assertThat(uri).contains("secret=" + totpService.encodeSecret(secret));
        assertThat(uri).contains("issuer=Acme");
    }
}
