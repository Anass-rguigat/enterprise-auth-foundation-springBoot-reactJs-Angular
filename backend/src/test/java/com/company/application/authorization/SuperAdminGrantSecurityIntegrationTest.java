package com.company.application.authorization;

import java.util.UUID;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 14 §24.10 — USER_ASSIGN_ROLE / SECURITY_MANAGE alone cannot grant SUPER_ADMIN.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SuperAdminGrantSecurityIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserAccountService userAccountService;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private RolePermissionRepository rolePermissionRepository;
    @Autowired
    private RoleAssignmentService roleAssignmentService;

    private String actorEmail;
    private UUID targetUserId;
    private CsrfSession csrf;

    @BeforeEach
    void setUp() throws Exception {
        Role ops = roleRepository.findByCode("SECURITY_OPS").orElseGet(() -> {
            Role role = new Role();
            role.setCode("SECURITY_OPS");
            role.setName("Security Ops");
            role.setSystemRole(false);
            return roleRepository.save(role);
        });
        for (String code : new String[]{Permissions.USER_ASSIGN_ROLE, Permissions.SECURITY_MANAGE}) {
            Permission permission = permissionRepository.findByCode(code).orElseThrow();
            RolePermission.Pk pk = new RolePermission.Pk(ops.getId(), permission.getId());
            if (!rolePermissionRepository.existsById(pk)) {
                RolePermission rp = new RolePermission();
                rp.setRoleId(ops.getId());
                rp.setPermissionId(permission.getId());
                rolePermissionRepository.save(rp);
            }
        }

        actorEmail = "ops-" + System.nanoTime() + "@example.com";
        User actor = userAccountService.createPendingUser(new CreateUserCommand(
                actorEmail, "Ops", "Admin", null, null, null
        ));
        userAccountService.activate(actor.getId());
        userAccountService.setPassword(actor.getId(), "CorrectHorseBattery1!");
        roleAssignmentService.assignRole(actor.getId(), "SECURITY_OPS");

        User target = userAccountService.createPendingUser(new CreateUserCommand(
                "target-" + System.nanoTime() + "@example.com",
                "Target",
                "User",
                null,
                null,
                null
        ));
        userAccountService.activate(target.getId());
        targetUserId = target.getId();

        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
    }

    @Test
    void userAssignRoleCannotAssignSuperAdminCode() throws Exception {
        MvcResult login = loginAsActor();

        CsrfSession mutationCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/admin/users/" + targetUserId + "/roles"), mutationCsrf)
                        .cookie(login.getResponse().getCookies())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleCode\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void securityManageAloneCannotCallGrantSuperAdminEndpoint() throws Exception {
        MvcResult login = loginAsActor();

        CsrfSession mutationCsrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(
                        post("/api/v1/admin/users/" + targetUserId + "/grant-super-admin"),
                        mutationCsrf
                )
                        .cookie(login.getResponse().getCookies())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"CorrectHorseBattery1!\"}"))
                .andExpect(status().isForbidden());
    }

    private MvcResult loginAsActor() throws Exception {
        return mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"CorrectHorseBattery1!"}
                                """.formatted(actorEmail)))
                .andExpect(status().isNoContent())
                .andReturn();
    }
}
