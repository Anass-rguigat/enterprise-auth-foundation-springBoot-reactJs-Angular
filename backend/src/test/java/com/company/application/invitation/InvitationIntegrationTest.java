package com.company.application.invitation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.company.application.support.AbstractPostgresIntegrationTest;
import com.company.application.support.CsrfRequestSupport;
import com.company.application.support.CsrfRequestSupport.CsrfSession;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static com.company.application.support.CsrfRequestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InvitationIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private InvitationService invitationService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void acceptInvitationActivatesUserAndAllowsLogin() throws Exception {
        User pending = userAccountService.createPendingUser(new CreateUserCommand(
                "invite-" + System.nanoTime() + "@example.com",
                "Inv",
                "Itee",
                null,
                null,
                null
        ));
        String rawToken = invitationService.createOrResendInvitation(pending.getId());

        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/invitations/accept"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(rawToken)))
                .andExpect(status().isNoContent());

        User activated = userRepository.findById(pending.getId()).orElseThrow();
        assertThat(activated.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(activated.isEmailVerified()).isTrue();
        assertThat(activated.getPasswordHash()).isNotBlank();

        CsrfSession loginCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/login"), loginCsrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(activated.getEmail())))
                .andExpect(status().isNoContent());
    }

    @Test
    void resendInvalidatesPreviousToken() throws Exception {
        User pending = userAccountService.createPendingUser(new CreateUserCommand(
                "resend-" + System.nanoTime() + "@example.com",
                "Re",
                "Send",
                null,
                null,
                null
        ));
        String first = invitationService.createOrResendInvitation(pending.getId());
        String second = invitationService.createOrResendInvitation(pending.getId());
        assertThat(second).isNotEqualTo(first);

        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/invitations/accept"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(first)))
                .andExpect(status().isUnauthorized());
    }
}
