package com.company.application.email;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OutboxCryptoServiceTest {

    private OutboxCryptoService crypto;

    @BeforeEach
    void setUp() {
        EmailKekProperties props = new EmailKekProperties();
        props.setCurrentKekId("test-1");
        // 32 zero bytes base64
        props.setKeks(Map.of("test-1", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));
        crypto = new OutboxCryptoService(props);
    }

    @Test
    void roundTripSucceedsWithMatchingAad() {
        UUID id = UUID.randomUUID();
        byte[] plaintext = "secret-link-token".getBytes(StandardCharsets.UTF_8);
        OutboxCryptoService.EncryptedPayload encrypted =
                crypto.encrypt(id, EmailTemplateCode.PASSWORD_RESET, "user@example.com", plaintext);

        byte[] decrypted = crypto.decrypt(
                id,
                EmailTemplateCode.PASSWORD_RESET,
                "user@example.com",
                encrypted.kekId(),
                encrypted.nonce(),
                encrypted.ciphertext()
        );
        assertThat(new String(decrypted, StandardCharsets.UTF_8)).isEqualTo("secret-link-token");
    }

    @Test
    void recipientTamperingFailsDecrypt() {
        UUID id = UUID.randomUUID();
        OutboxCryptoService.EncryptedPayload encrypted = crypto.encrypt(
                id,
                EmailTemplateCode.INVITATION,
                "legit@example.com",
                "payload".getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> crypto.decrypt(
                id,
                EmailTemplateCode.INVITATION,
                "attacker@evil.com",
                encrypted.kekId(),
                encrypted.nonce(),
                encrypted.ciphertext()
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("decryption failed");
    }
}
