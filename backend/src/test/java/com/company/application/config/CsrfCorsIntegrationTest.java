package com.company.application.config;

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

import static com.company.application.support.CsrfRequestSupport.withCsrf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CsrfCorsIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void csrfEndpointReturnsBodyTokenAndCookie() throws Exception {
        mockMvc.perform(get("/api/v1/auth/csrf").header("Origin", CsrfRequestSupport.TEST_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void loginWithoutCsrfTokenIsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .header("Origin", CsrfRequestSupport.TEST_ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginWithoutOriginIsForbidden() throws Exception {
        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-XSRF-TOKEN", csrf.token())
                        .cookie(csrf.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"x\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ORIGIN_REJECTED"));
    }

    @Test
    void rejectedOriginIsForbiddenEvenWithCsrf() throws Exception {
        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(post("/api/v1/auth/login")
                        .header("Origin", "https://evil.example")
                        .header("X-XSRF-TOKEN", csrf.token())
                        .cookie(csrf.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"x\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ORIGIN_REJECTED"));
    }

    @Test
    void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", CsrfRequestSupport.TEST_ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type, X-XSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", CsrfRequestSupport.TEST_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("X-XSRF-TOKEN")));
    }

    @Test
    void securityHeadersPresentOnApiResponses() throws Exception {
        mockMvc.perform(get("/api/v1/meta/info"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", containsString("camera=()")));
    }

    @Test
    void loginWithCsrfAndOriginReachesAuthLogic() throws Exception {
        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"missing@example.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }
}
