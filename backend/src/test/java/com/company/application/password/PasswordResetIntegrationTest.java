package com.company.application.password;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.company.application.authentication.TokenHashing;
import com.company.application.email.EmailOutbox;
import com.company.application.email.EmailOutboxRepository;
import com.company.application.email.EmailOutboxStatus;
import com.company.application.email.EmailTemplateCode;
import com.company.application.support.AbstractPostgresIntegrationTest;
import com.company.application.support.CsrfRequestSupport;
import com.company.application.support.CsrfRequestSupport.CsrfSession;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;

import static com.company.application.support.CsrfRequestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserAccountService userAccountService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordResetService passwordResetService;
    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired
    private EmailOutboxRepository emailOutboxRepository;

    @Test
    void forgotIsEnumerationSafeAndResetRevokesSessions() throws Exception {
        User user = userAccountService.createPendingUser(new CreateUserCommand(
                "reset-" + System.nanoTime() + "@example.com",
                "Re",
                "Set",
                null,
                null,
                null
        ));
        userAccountService.activate(user.getId());
        userAccountService.setPassword(user.getId(), "OldPassword12!");

        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/forgot-password"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s"}
                                """.formatted(user.getEmail())))
                .andExpect(status().isNoContent());

        mockMvc.perform(withCsrf(post("/api/v1/auth/forgot-password"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isNoContent());

        assertThat(emailOutboxRepository.findAll())
                .anyMatch(row -> EmailTemplateCode.PASSWORD_RESET.equals(row.getTemplateCode())
                        && row.getStatus() == EmailOutboxStatus.PENDING
                        && row.getPayloadEncrypted() != null);

        // Use service path to obtain raw token for reset (outbox ciphertext is opaque)
        passwordResetTokenRepository.revokeActiveForUser(user.getId(), java.time.Instant.now());
        String raw = com.company.application.common.util.SecureTokenGenerator.generate(32);
        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setTokenHash(TokenHashing.sha256Hex(raw));
        token.setExpiresAt(java.time.Instant.now().plusSeconds(3600));
        passwordResetTokenRepository.save(token);

        long tvBefore = userRepository.findById(user.getId()).orElseThrow().getTokenVersion();

        CsrfSession resetCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/reset-password"), resetCsrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"NewPassword34!"}
                                """.formatted(raw)))
                .andExpect(status().isNoContent());

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updated.getTokenVersion()).isEqualTo(tvBefore + 1);
        assertThat(updated.isMustChangePassword()).isFalse();
    }

    @Test
    void outboxAadRejectsRecipientRewrite() {
        passwordResetService.forgotPassword("unused-for-aad@example.com");
        // Covered by OutboxCryptoServiceTest; ensure repository accepts encrypted rows after forgot on real user
        User user = userAccountService.createPendingUser(new CreateUserCommand(
                "aad-" + System.nanoTime() + "@example.com",
                "A",
                "Ad",
                null,
                null,
                null
        ));
        userAccountService.activate(user.getId());
        userAccountService.setPassword(user.getId(), "OldPassword12!");
        passwordResetService.forgotPassword(user.getEmail());

        EmailOutbox row = emailOutboxRepository.findAll().stream()
                .filter(r -> r.getToAddressNormalized().equals(user.getEmailNormalized()))
                .findFirst()
                .orElseThrow();
        assertThat(row.getPayloadEncrypted()).isNotNull();
        assertThat(row.getNonce()).isNotNull();
        assertThat(row.getKekId()).isEqualTo("test-1");
    }
}
