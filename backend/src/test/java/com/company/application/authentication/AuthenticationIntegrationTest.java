package com.company.application.authentication;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.company.application.support.AbstractPostgresIntegrationTest;
import com.company.application.support.CsrfRequestSupport;
import com.company.application.support.CsrfRequestSupport.CsrfSession;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;

import static com.company.application.support.CsrfRequestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountService userAccountService;

    private String uniqueEmail;
    private CsrfSession csrf;

    @BeforeEach
    void createActiveUser() throws Exception {
        uniqueEmail = "auth-" + System.nanoTime() + "@example.com";
        User user = userAccountService.createPendingUser(new CreateUserCommand(
                uniqueEmail,
                "Auth",
                "User",
                null,
                null,
                null
        ));
        userAccountService.activate(user.getId());
        userAccountService.setPassword(user.getId(), "CorrectHorseBattery1!");
        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
    }

    @Test
    void loginSetsHttpOnlyCookiesAndMeReturnsUser() throws Exception {
        MvcResult login = mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(uniqueEmail)))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists("access_token"))
                .andExpect(cookie().httpOnly("access_token", true))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true))
                .andReturn();

        String accessCookie = login.getResponse().getCookie("access_token").getValue();
        assertThat(accessCookie).isNotBlank();

        mockMvc.perform(get("/api/v1/auth/me").cookie(login.getResponse().getCookies()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(uniqueEmail))
                .andExpect(jsonPath("$.firstName").value("Auth"))
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void invalidPasswordReturnsGenericUnauthorized() throws Exception {
        mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"wrong-password"}
                                """.formatted(uniqueEmail)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void refreshRotatesCookiesAndUpdatesLastUsedAt() throws Exception {
        MvcResult login = mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(uniqueEmail)))
                .andExpect(status().isNoContent())
                .andReturn();

        String oldRefresh = login.getResponse().getCookie("refresh_token").getValue();
        CsrfSession refreshCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);

        MvcResult refreshed = mockMvc.perform(withCsrf(post("/api/v1/auth/refresh"), refreshCsrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists("access_token"))
                .andExpect(cookie().exists("refresh_token"))
                .andReturn();

        String newRefresh = refreshed.getResponse().getCookie("refresh_token").getValue();
        assertThat(newRefresh).isNotBlank().isNotEqualTo(oldRefresh);

        mockMvc.perform(get("/api/v1/auth/me").cookie(refreshed.getResponse().getCookies()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(uniqueEmail));

        CsrfSession reuseCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/refresh"), reuseCsrf)
                        .cookie(login.getResponse().getCookie("refresh_token")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithValidRefreshReturns204AndClearsCookies() throws Exception {
        MvcResult login = mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(uniqueEmail)))
                .andExpect(status().isNoContent())
                .andReturn();

        CsrfSession logoutCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/logout"), logoutCsrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("access_token", 0))
                .andExpect(cookie().maxAge("refresh_token", 0));

        mockMvc.perform(get("/api/v1/auth/me").cookie(login.getResponse().getCookies()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithInvalidRefreshAloneStillReturns204() throws Exception {
        mockMvc.perform(withCsrf(post("/api/v1/auth/logout"), csrf)
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "not-a-jwt")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("access_token", 0))
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    void logoutAllInvalidatesOtherSessionsViaTokenVersion() throws Exception {
        MvcResult sessionA = mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(uniqueEmail)))
                .andExpect(status().isNoContent())
                .andReturn();

        CsrfSession loginBCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        MvcResult sessionB = mockMvc.perform(withCsrf(post("/api/v1/auth/login"), loginBCsrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(uniqueEmail)))
                .andExpect(status().isNoContent())
                .andReturn();

        CsrfSession logoutAllCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/logout-all"), logoutAllCsrf)
                        .cookie(sessionA.getResponse().getCookies()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("access_token", 0));

        mockMvc.perform(get("/api/v1/auth/me").cookie(sessionB.getResponse().getCookies()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mustChangePasswordBlocksNonAllowlistedEndpoints() throws Exception {
        User user = userAccountService.createPendingUser(new CreateUserCommand(
                "mcp-" + System.nanoTime() + "@example.com",
                "Must",
                "Change",
                null,
                null,
                null
        ));
        userAccountService.activate(user.getId());
        userAccountService.setPassword(user.getId(), "CorrectHorseBattery1!");
        userAccountService.requirePasswordChange(user.getId(), true);

        MvcResult login = mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(user.getEmail())))
                .andExpect(status().isNoContent())
                .andReturn();

        mockMvc.perform(get("/api/v1/auth/me").cookie(login.getResponse().getCookies()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        mockMvc.perform(get("/api/v1/meta/info").cookie(login.getResponse().getCookies()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/auth/unknown-protected").cookie(login.getResponse().getCookies()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_CHANGE_REQUIRED"));
    }
}
