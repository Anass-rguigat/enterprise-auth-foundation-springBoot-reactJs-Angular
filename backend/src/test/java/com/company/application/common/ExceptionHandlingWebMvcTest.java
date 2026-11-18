package com.company.application.common;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.company.application.common.exception.GlobalExceptionHandler;
import com.company.application.common.web.CorrelationIdFilter;
import com.company.application.common.web.ErrorDemoController;
import com.company.application.common.web.HealthInfoController;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = {ErrorDemoController.class, HealthInfoController.class},
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                UserDetailsServiceAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                ServletWebSecurityAutoConfiguration.class
        }
)
@Import({GlobalExceptionHandler.class, CorrelationIdFilter.class})
@ActiveProfiles("test")
class ExceptionHandlingWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void notFoundReturnsProblemDetailsWithCorrelationId() throws Exception {
        mockMvc.perform(get("/api/v1/_demo/not-found").header("X-Correlation-Id", "webmvc-corr-1"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("X-Correlation-Id", "webmvc-corr-1"))
                .andExpect(jsonPath("$.title").value("NOT_FOUND"))
                .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"))
                .andExpect(jsonPath("$.correlationId").value("webmvc-corr-1"))
                .andExpect(jsonPath("$.detail", containsString("Demo resource")));
    }

    @Test
    void validationFailureReturnsFieldErrors() throws Exception {
        mockMvc.perform(post("/api/v1/_demo/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fields.name").value("name must not be blank"));
    }

    @Test
    void correlationIdIsGeneratedWhenMissing() throws Exception {
        mockMvc.perform(get("/api/v1/meta/info"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Correlation-Id", not(emptyOrNullString())))
                .andExpect(jsonPath("$.phase").value("28"));
    }
}
