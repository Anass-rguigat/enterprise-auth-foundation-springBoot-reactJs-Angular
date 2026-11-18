package com.company.application.authentication;

import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.company.application.authentication.jwt.JwtService;
import com.company.application.authentication.token.TokenFamily;
import com.company.application.authentication.token.TokenFamilyRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 14 security matrix: family revocation, refresh reuse, wrong token types, cookie clear.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityMatrixIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserAccountService userAccountService;
    @Autowired
    private TokenFamilyRepository tokenFamilyRepository;
    @Autowired
    private JwtService jwtService;

    private String email;
    private CsrfSession csrf;

    @BeforeEach
    void setUpUser() throws Exception {
        email = "sec-" + System.nanoTime() + "@example.com";
        User user = userAccountService.createPendingUser(new CreateUserCommand(
                email, "Sec", "User", null, null, null
        ));
        userAccountService.activate(user.getId());
        userAccountService.setPassword(user.getId(), "CorrectHorseBattery1!");
        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
    }

    @Test
    void revokedFamilyBlocksAccessWithoutDenylistingJti() throws Exception {
        MvcResult login = login();
        Cookie access = login.getResponse().getCookie("access_token");
        UUID familyId = jwtService.parseAccessToken(access.getValue()).familyId();

        TokenFamily family = tokenFamilyRepository.findById(familyId).orElseThrow();
        family.revoke("TEST_REVOKE");
        tokenFamilyRepository.save(family);

        mockMvc.perform(get("/api/v1/auth/me").cookie(access))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshReuseRevokesFamilyAndInvalidatesPriorAccess() throws Exception {
        MvcResult login = login();
        Cookie oldAccess = login.getResponse().getCookie("access_token");
        Cookie oldRefresh = login.getResponse().getCookie("refresh_token");
        UUID familyId = jwtService.parseAccessToken(oldAccess.getValue()).familyId();

        CsrfSession refreshCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/refresh"), refreshCsrf).cookie(oldRefresh))
                .andExpect(status().isNoContent());

        CsrfSession reuseCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/refresh"), reuseCsrf).cookie(oldRefresh))
                .andExpect(status().isUnauthorized());

        TokenFamily family = tokenFamilyRepository.findById(familyId).orElseThrow();
        assertThat(family.isRevoked()).isTrue();
        assertThat(family.getRevokeReason()).isEqualTo("REFRESH_REUSE");

        mockMvc.perform(get("/api/v1/auth/me").cookie(oldAccess))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessJwtRejectedOnRefreshEndpoint() throws Exception {
        MvcResult login = login();
        Cookie access = login.getResponse().getCookie("access_token");
        CsrfSession refreshCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);

        mockMvc.perform(withCsrf(post("/api/v1/auth/refresh"), refreshCsrf).cookie(access))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshJwtRejectedOnOrdinaryApi() throws Exception {
        MvcResult login = login();
        Cookie refresh = login.getResponse().getCookie("refresh_token");

        mockMvc.perform(get("/api/v1/auth/me").cookie(new Cookie("access_token", refresh.getValue())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutClearsCookiesWithMatchingAttributes() throws Exception {
        MvcResult login = login();
        CsrfSession logoutCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);

        MvcResult logout = mockMvc.perform(withCsrf(post("/api/v1/auth/logout"), logoutCsrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("access_token", 0))
                .andExpect(cookie().maxAge("refresh_token", 0))
                .andReturn();

        Cookie clearedAccess = logout.getResponse().getCookie("access_token");
        Cookie clearedRefresh = logout.getResponse().getCookie("refresh_token");
        assertThat(clearedAccess.getValue()).isNullOrEmpty();
        assertThat(clearedAccess.getPath()).isEqualTo("/");
        assertThat(clearedAccess.isHttpOnly()).isTrue();
        assertThat(clearedRefresh.getValue()).isNullOrEmpty();
        assertThat(clearedRefresh.getPath()).isEqualTo("/");
        assertThat(clearedRefresh.isHttpOnly()).isTrue();
    }

    @Test
    void logoutMatchingPairRevokesFamilyInDatabase() throws Exception {
        MvcResult login = login();
        UUID familyId = jwtService.parseAccessToken(
                login.getResponse().getCookie("access_token").getValue()
        ).familyId();

        CsrfSession logoutCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/logout"), logoutCsrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isNoContent());

        assertThat(tokenFamilyRepository.findById(familyId).orElseThrow().isRevoked()).isTrue();
    }

    private MvcResult login() throws Exception {
        return mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(email)))
                .andExpect(status().isNoContent())
                .andReturn();
    }
}
