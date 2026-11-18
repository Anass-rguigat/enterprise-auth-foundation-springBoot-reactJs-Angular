package com.company.application.support;

import jakarta.servlet.http.Cookie;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public final class CsrfRequestSupport {

    public static final String TEST_ORIGIN = "http://localhost:5173";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private CsrfRequestSupport() {
    }

    public static CsrfSession fetchCsrf(MockMvc mockMvc) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/auth/csrf").header("Origin", TEST_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        JsonNode body = MAPPER.readTree(result.getResponse().getContentAsString());
        Cookie csrfCookie = result.getResponse().getCookie("XSRF-TOKEN");
        return new CsrfSession(body.get("token").asString(), csrfCookie);
    }

    public static MockHttpServletRequestBuilder withCsrf(
            MockHttpServletRequestBuilder builder,
            CsrfSession csrf
    ) {
        return builder
                .header("Origin", TEST_ORIGIN)
                .header("X-XSRF-TOKEN", csrf.token())
                .cookie(csrf.cookie());
    }

    public record CsrfSession(String token, Cookie cookie) {
    }
}
