package com.company.application.business.demo.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.company.application.authentication.AuthenticatedUser;
import com.company.application.business.demo.DemoNote;
import com.company.application.business.demo.DemoNoteService;
import com.company.application.common.exception.GlobalExceptionHandler;
import com.company.application.user.User;
import com.company.application.user.UserStatus;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = DemoNoteController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                UserDetailsServiceAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                ServletWebSecurityAutoConfiguration.class
        }
)
@Import({GlobalExceptionHandler.class, DemoNoteControllerWebMvcTest.PrincipalConfig.class})
@ActiveProfiles("test")
class DemoNoteControllerWebMvcTest {

    static final UUID OWNER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DemoNoteService demoNoteService;

    @Test
    void createReturnsCreatedNote() throws Exception {
        DemoNote note = sampleNote();
        when(demoNoteService.create(eq(OWNER_ID), eq("Title"), eq("Body"))).thenReturn(note);

        mockMvc.perform(post("/api/v1/demo/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Title","body":"Body"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Hello"))
                .andExpect(jsonPath("$.id").value(note.getId().toString()));
    }

    @Test
    void createRejectsBlankTitle() throws Exception {
        mockMvc.perform(post("/api/v1/demo/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"","body":"x"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    void listReturnsNotes() throws Exception {
        when(demoNoteService.listMine(OWNER_ID)).thenReturn(List.of(sampleNote()));

        mockMvc.perform(get("/api/v1/demo/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Hello"));
    }

    @Test
    void updateDelegates() throws Exception {
        DemoNote note = sampleNote();
        when(demoNoteService.update(eq(OWNER_ID), eq(note.getId()), eq("New"), isNull())).thenReturn(note);

        mockMvc.perform(put("/api/v1/demo/notes/" + note.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"New"}
                                """))
                .andExpect(status().isOk());

        verify(demoNoteService).update(eq(OWNER_ID), eq(note.getId()), eq("New"), isNull());
    }

    @Test
    void deleteReturnsNoContent() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/demo/notes/" + id))
                .andExpect(status().isNoContent());

        verify(demoNoteService).delete(eq(OWNER_ID), eq(id));
    }

    private static DemoNote sampleNote() {
        DemoNote note = new DemoNote();
        note.setId(UUID.randomUUID());
        note.setOwnerUserId(OWNER_ID);
        note.setTitle("Hello");
        note.setBody("World");
        try {
            var created = DemoNote.class.getDeclaredField("createdAt");
            created.setAccessible(true);
            created.set(note, Instant.parse("2026-01-01T00:00:00Z"));
            var updated = DemoNote.class.getDeclaredField("updatedAt");
            updated.setAccessible(true);
            updated.set(note, Instant.parse("2026-01-01T00:00:00Z"));
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return note;
    }

    @org.springframework.boot.test.context.TestConfiguration
    static class PrincipalConfig implements WebMvcConfigurer {
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
            resolvers.add(new HandlerMethodArgumentResolver() {
                @Override
                public boolean supportsParameter(MethodParameter parameter) {
                    return AuthenticatedUser.class.isAssignableFrom(parameter.getParameterType());
                }

                @Override
                public Object resolveArgument(
                        MethodParameter parameter,
                        ModelAndViewContainer mavContainer,
                        NativeWebRequest webRequest,
                        WebDataBinderFactory binderFactory
                ) {
                    User user = new User();
                    user.setId(OWNER_ID);
                    user.setStatus(UserStatus.ACTIVE);
                    return new AuthenticatedUser(user, UUID.randomUUID(), UUID.randomUUID(), List.of());
                }
            });
        }
    }
}
