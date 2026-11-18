package com.company.application.administration.web;

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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.company.application.administration.AdminUserService;
import com.company.application.authorization.PermissionQueryService;
import com.company.application.common.exception.GlobalExceptionHandler;
import com.company.application.profile.UserProfile;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserStatus;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = AdminUserController.class,
        excludeAutoConfiguration = {
                SecurityAutoConfiguration.class,
                UserDetailsServiceAutoConfiguration.class,
                SecurityFilterAutoConfiguration.class,
                ServletWebSecurityAutoConfiguration.class
        }
)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class AdminUserMassAssignmentWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private PermissionQueryService permissionQueryService;

    @Test
    void createIgnoresStatusRolesAndPasswordFields() throws Exception {
        User created = sampleUser();
        when(adminUserService.createUser(isNull(), any(CreateUserCommand.class), nullable(List.class))).thenReturn(created);
        when(permissionQueryService.findRoleCodes(created.getId())).thenReturn(List.of());
        when(permissionQueryService.findPermissionCodes(created.getId())).thenReturn(List.of());

        mockMvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "new.user@example.com",
                                  "firstName": "New",
                                  "lastName": "User",
                                  "sendInvitation": false,
                                  "status": "ACTIVE",
                                  "roles": ["SUPER_ADMIN"],
                                  "password": "AttackerPassword1!",
                                  "mustChangePassword": false
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new.user@example.com"))
                .andExpect(jsonPath("$.status").value("PENDING_ACTIVATION"));

        verify(adminUserService).createUser(isNull(), any(CreateUserCommand.class), nullable(List.class));
    }

    @Test
    void updateOnlyAppliesProfileBasics() throws Exception {
        User updated = sampleUser();
        when(adminUserService.updateBasics(
                eq(updated.getId()),
                eq("Ada"),
                eq("Lovelace"),
                eq("+1"),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        )).thenReturn(updated);
        when(permissionQueryService.findRoleCodes(updated.getId())).thenReturn(List.of());
        when(permissionQueryService.findPermissionCodes(updated.getId())).thenReturn(List.of());

        mockMvc.perform(patch("/api/v1/admin/users/" + updated.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Ada",
                                  "lastName": "Lovelace",
                                  "phone": "+1",
                                  "status": "DISABLED",
                                  "email": "hijack@example.com",
                                  "roles": ["SUPER_ADMIN"]
                                }
                                """))
                .andExpect(status().isOk());

        verify(adminUserService).updateBasics(
                updated.getId(),
                "Ada",
                "Lovelace",
                "+1",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private static User sampleUser() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("new.user@example.com");
        user.setStatus(UserStatus.PENDING_ACTIVATION);
        UserProfile profile = new UserProfile();
        profile.setFirstName("New");
        profile.setLastName("User");
        profile.setUser(user);
        user.setProfile(profile);
        return user;
    }
}
