package com.company.application.authorization;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.support.AbstractPostgresIntegrationTest;
import com.company.application.support.CsrfRequestSupport;
import com.company.application.support.CsrfRequestSupport.CsrfSession;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;
import static com.company.application.support.CsrfRequestSupport.withCsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 16: role catalog APIs, escalation (E1–E8), concurrency (C1–C8), FK RESTRICT.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoleCatalogIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserAccountService userAccountService;
    @Autowired
    private RoleAssignmentService roleAssignmentService;
    @Autowired
    private RoleManagementService roleManagementService;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private RolePermissionRepository rolePermissionRepository;
    @Autowired
    private UserRoleRepository userRoleRepository;
    @Autowired
    private PermissionQueryService permissionQueryService;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private PlatformTransactionManager transactionManager;

    private String adminEmail;
    private String adminPassword = "CorrectHorseBattery1!";
    private UUID adminUserId;

    @BeforeEach
    void setUp() {
        adminEmail = "sa-" + System.nanoTime() + "@example.com";
        User admin = userAccountService.createPendingUser(new CreateUserCommand(
                adminEmail, "Super", "Admin", null, null, null
        ));
        userAccountService.activate(admin.getId());
        userAccountService.setPassword(admin.getId(), adminPassword);
        roleAssignmentService.assignSuperAdmin(admin.getId());
        adminUserId = admin.getId();
    }

    @Test
    void superAdminCanCrudCustomRoleAndPermissions() throws Exception {
        MvcResult login = login(adminEmail, adminPassword);
        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        String code = "CUSTOM_" + System.nanoTime();

        mockMvc.perform(withCsrf(post("/api/v1/admin/roles"), csrf)
                        .cookie(login.getResponse().getCookies())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"%s","name":"Custom","description":"d"}
                                """.formatted(code)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.systemRole").value(false))
                .andExpect(jsonPath("$.permissionCodes").isEmpty());

        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/admin/roles/" + code + "/permissions"), csrf)
                        .cookie(login.getResponse().getCookies())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"permissionCode":"%s"}
                                """.formatted(Permissions.USER_READ)))
                .andExpect(status().isNoContent());

        // idempotent attach
        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(post("/api/v1/admin/roles/" + code + "/permissions"), csrf)
                        .cookie(login.getResponse().getCookies())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"permissionCode":"%s"}
                                """.formatted(Permissions.USER_READ)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/admin/roles/" + code)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissionCodes[0]").value(Permissions.USER_READ));

        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(patch("/api/v1/admin/roles/" + code), csrf)
                        .cookie(login.getResponse().getCookies())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Renamed","description":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"));

        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(delete("/api/v1/admin/roles/" + code + "/permissions/" + Permissions.USER_READ), csrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isNoContent());

        csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(delete("/api/v1/admin/roles/" + code), csrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isNoContent());
    }

    @Test
    void e1CannotAttachPermissionActorDoesNotHold() {
        UUID actorId = createUserWithPermissions("delegator", Permissions.ROLE_ASSIGN_PERMISSION, Permissions.ROLE_CREATE);
        String code = "ESC_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "Esc", null);

        assertThatThrownBy(() -> roleManagementService.attachPermission(actorId, code, Permissions.USER_DELETE))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void e2e3AttachHeldPermissionThenSelfAssignVisibleOnNextQuery() {
        UUID actorId = createUserWithPermissions(
                "limited",
                Permissions.ROLE_ASSIGN_PERMISSION,
                Permissions.USER_ASSIGN_ROLE,
                Permissions.USER_READ
        );
        String code = "HELD_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "Held", null);
        roleManagementService.attachPermission(actorId, code, Permissions.USER_READ);
        roleAssignmentService.assignRole(actorId, actorId, code);

        assertThat(permissionQueryService.findPermissionCodes(actorId)).contains(Permissions.USER_READ);
    }

    @Test
    void e5CannotAssignRoleExceedingPermissions() {
        UUID actorId = createUserWithPermissions("assigner", Permissions.USER_ASSIGN_ROLE, Permissions.USER_READ);
        String code = "POWER_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "Power", null);
        roleManagementService.attachPermission(adminUserId, code, Permissions.USER_DELETE);

        assertThatThrownBy(() -> roleAssignmentService.assignRole(actorId, actorId, code))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void e7CannotMutateSuperAdminPermissions() {
        assertThatThrownBy(() -> roleManagementService.attachPermission(
                adminUserId, Role.SUPER_ADMIN, Permissions.USER_READ
        )).isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void c2DeleteAfterAssignReturnsConflict() {
        String code = "C2_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "C2", null);
        UUID userId = createPlainUser("c2user");
        roleAssignmentService.assignRole(userId, code);

        assertThatThrownBy(() -> roleManagementService.deleteRole(adminUserId, code))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void c3AssignAfterDeleteReturnsNotFound() {
        String code = "C3_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "C3", null);
        roleManagementService.deleteRole(adminUserId, code);
        UUID userId = createPlainUser("c3user");

        assertThatThrownBy(() -> roleAssignmentService.assignRole(userId, code))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void c6FkRestrictPreventsDeleteWithAssignments() {
        String code = "C6_" + System.nanoTime();
        RoleViewCreated created = createRoleEntity(code);
        UUID userId = createPlainUser("c6user");
        roleAssignmentService.assignRole(userId, code);

        assertThatThrownBy(() -> jdbcTemplate.update("DELETE FROM roles WHERE id = ?", created.id()))
                .isInstanceOf(Exception.class);

        assertThat(roleRepository.findByCode(code)).isPresent();
        assertThat(userRoleRepository.countByRoleId(created.id())).isEqualTo(1);
    }

    @Test
    void c1ConcurrentAssignVersusDelete() throws Exception {
        String code = "C1_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "C1", null);
        UUID userId = createPlainUser("c1user");

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        AtomicReference<Throwable> assignError = new AtomicReference<>();
        AtomicReference<Throwable> deleteError = new AtomicReference<>();

        Future<?> assignFuture = pool.submit(() -> {
            await(start);
            try {
                roleAssignmentService.assignRole(userId, code);
            } catch (Throwable t) {
                assignError.set(t);
            }
        });
        Future<?> deleteFuture = pool.submit(() -> {
            await(start);
            try {
                roleManagementService.deleteRole(adminUserId, code);
            } catch (Throwable t) {
                deleteError.set(t);
            }
        });
        start.countDown();
        assignFuture.get(30, TimeUnit.SECONDS);
        deleteFuture.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        boolean roleExists = roleRepository.findByCode(code).isPresent();
        long assignments = roleExists
                ? userRoleRepository.countByRoleId(roleRepository.findByCode(code).orElseThrow().getId())
                : 0;

        if (roleExists) {
            assertThat(assignments).isGreaterThanOrEqualTo(1);
            assertThat(deleteError.get()).isInstanceOf(ApplicationException.class);
        } else {
            assertThat(assignments).isZero();
            assertThat(assignError.get()).isNotNull();
        }
    }

    @Test
    void c8TwoTransactionsLockSerializesSubsetCheckAgainstPermissionAttach() throws Exception {
        String code = "C8_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, code, "C8", null);
        roleManagementService.attachPermission(adminUserId, code, Permissions.USER_READ);
        UUID actorId = createUserWithPermissions(
                "c8actor",
                Permissions.USER_ASSIGN_ROLE,
                Permissions.USER_READ
        );
        UUID targetId = createPlainUser("c8target");

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        CountDownLatch assignHoldsLock = new CountDownLatch(1);
        CountDownLatch allowAssignCommit = new CountDownLatch(1);
        AtomicReference<Throwable> assignError = new AtomicReference<>();
        AtomicReference<Throwable> attachError = new AtomicReference<>();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> assignFuture = pool.submit(() -> {
            try {
                tx.executeWithoutResult(status -> {
                    Role locked = roleRepository.findByCodeForUpdate(code).orElseThrow();
                    assignHoldsLock.countDown();
                    await(allowAssignCommit);
                    // Still under same FOR UPDATE: concurrent attach must not have applied yet
                    assertThat(permissionRepository.findCodesByRoleId(locked.getId()))
                            .containsExactly(Permissions.USER_READ);
                    roleAssignmentService.assignRole(actorId, targetId, code);
                });
            } catch (Throwable t) {
                assignError.set(t);
            }
        });

        Future<?> attachFuture = pool.submit(() -> {
            await(assignHoldsLock);
            try {
                // Blocks on roles FOR UPDATE until assign TX commits
                roleManagementService.attachPermission(adminUserId, code, Permissions.USER_DELETE);
            } catch (Throwable t) {
                attachError.set(t);
            }
        });

        assertThat(assignHoldsLock.await(10, TimeUnit.SECONDS)).isTrue();
        // Give attach thread time to block on the lock
        Thread.sleep(200);
        allowAssignCommit.countDown();

        assignFuture.get(30, TimeUnit.SECONDS);
        attachFuture.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(assignError.get()).isNull();
        assertThat(attachError.get()).isNull();
        Role role = roleRepository.findByCode(code).orElseThrow();
        assertThat(userRoleRepository.existsByUserIdAndRoleId(targetId, role.getId())).isTrue();
        // Attach applied only after assign committed — no torn subset/insert
        assertThat(permissionRepository.findCodesByRoleId(role.getId()))
                .contains(Permissions.USER_READ, Permissions.USER_DELETE);
    }

    @Test
    void cannotDeleteSuperAdminRoleViaApi() throws Exception {
        MvcResult login = login(adminEmail, adminPassword);
        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        mockMvc.perform(withCsrf(delete("/api/v1/admin/roles/" + Role.SUPER_ADMIN), csrf)
                        .cookie(login.getResponse().getCookies()))
                .andExpect(status().isForbidden());
    }

    private MvcResult login(String email, String password) throws Exception {
        CsrfSession csrf = CsrfRequestSupport.fetchCsrf(mockMvc);
        return mockMvc.perform(withCsrf(post("/api/v1/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isNoContent())
                .andReturn();
    }

    private UUID createPlainUser(String prefix) {
        User user = userAccountService.createPendingUser(new CreateUserCommand(
                prefix + "-" + System.nanoTime() + "@example.com",
                "A", "B", null, null, null
        ));
        userAccountService.activate(user.getId());
        userAccountService.setPassword(user.getId(), adminPassword);
        return user.getId();
    }

    private UUID createUserWithPermissions(String prefix, String... permissionCodes) {
        UUID userId = createPlainUser(prefix);
        String roleCode = "R_" + prefix.toUpperCase() + "_" + System.nanoTime();
        roleManagementService.createRole(adminUserId, roleCode, roleCode, null);
        for (String permissionCode : permissionCodes) {
            roleManagementService.attachPermission(adminUserId, roleCode, permissionCode);
        }
        roleAssignmentService.assignRole(userId, roleCode);
        return userId;
    }

    private RoleViewCreated createRoleEntity(String code) {
        var view = roleManagementService.createRole(adminUserId, code, code, null);
        Role role = roleRepository.findByCode(view.code()).orElseThrow();
        return new RoleViewCreated(role.getId(), role.getCode());
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(20, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Latch timeout");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private record RoleViewCreated(UUID id, String code) {
    }
}
