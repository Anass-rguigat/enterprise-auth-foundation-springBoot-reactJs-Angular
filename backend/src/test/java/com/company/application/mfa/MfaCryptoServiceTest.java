package com.company.application.mfa;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MfaCryptoServiceTest {

    private MfaCryptoService cryptoService;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        cryptoService = new MfaCryptoService(new MfaProperties());
    }

    @Test
    void roundTripDecryptsSecret() {
        byte[] secret = new byte[]{9, 8, 7, 6, 5};
        MfaCryptoService.EncryptedSecret encrypted = cryptoService.encrypt(
                userId,
                MfaCryptoService.CONTEXT_CONFIGURATION,
                secret
        );
        byte[] plain = cryptoService.decrypt(
                userId,
                MfaCryptoService.CONTEXT_CONFIGURATION,
                encrypted.kekId(),
                encrypted.nonce(),
                encrypted.ciphertext()
        );
        assertThat(plain).isEqualTo(secret);
    }

    @Test
    void wrongContextAadFails() {
        byte[] secret = new byte[]{1, 2, 3};
        MfaCryptoService.EncryptedSecret encrypted = cryptoService.encrypt(
                userId,
                MfaCryptoService.CONTEXT_ENROLLMENT,
                secret
        );
        assertThatThrownBy(() -> cryptoService.decrypt(
                userId,
                MfaCryptoService.CONTEXT_CONFIGURATION,
                encrypted.kekId(),
                encrypted.nonce(),
                encrypted.ciphertext()
        )).isInstanceOf(IllegalStateException.class);
    }
}
