package com.company.application.administration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.authorization.RoleAssignmentService;
import com.company.application.password.PasswordPolicy;
import com.company.application.user.CreateUserCommand;
import com.company.application.user.User;
import com.company.application.user.UserAccountService;

/**
 * Controlled one-time SUPER_ADMIN bootstrap. No public HTTP endpoint.
 * Invariant: create iff count(user_roles ⨝ SUPER_ADMIN) = 0 under advisory lock.
 * DISABLED/DELETED users that still hold SUPER_ADMIN still block bootstrap.
 */
@Component
@Order(100)
public class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    /** Stable advisory lock key for bootstrap (arbitrary constant). */
    private static final long BOOTSTRAP_LOCK_KEY = 4_702_711L;

    private final BootstrapProperties properties;
    private final JdbcTemplate jdbcTemplate;
    private final RoleAssignmentService roleAssignmentService;
    private final UserAccountService userAccountService;
    private final PasswordPolicy passwordPolicy;

    public BootstrapAdminRunner(
            BootstrapProperties properties,
            JdbcTemplate jdbcTemplate,
            RoleAssignmentService roleAssignmentService,
            UserAccountService userAccountService,
            PasswordPolicy passwordPolicy
    ) {
        this.properties = properties;
        this.jdbcTemplate = jdbcTemplate;
        this.roleAssignmentService = roleAssignmentService;
        this.userAccountService = userAccountService;
        this.passwordPolicy = passwordPolicy;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            return;
        }

        String email = properties.getEmail() == null ? "" : properties.getEmail().trim();
        String password = properties.getPassword() == null ? "" : properties.getPassword();
        if (email.isBlank() || password.isBlank()) {
            throw new IllegalStateException(
                    "app.bootstrap.enabled=true requires BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD"
            );
        }
        passwordPolicy.validate(password);

        jdbcTemplate.queryForList("SELECT pg_advisory_xact_lock(?)", BOOTSTRAP_LOCK_KEY);

        long superAdminCount = roleAssignmentService.countSuperAdmins();
        if (superAdminCount > 0) {
            log.info("Bootstrap skipped: {} SUPER_ADMIN assignment(s) already exist", superAdminCount);
            return;
        }

        User user = userAccountService.createPendingUser(new CreateUserCommand(
                email,
                properties.getFirstName(),
                properties.getLastName(),
                null,
                null,
                null
        ));
        userAccountService.setPassword(user.getId(), password);
        userAccountService.activate(user.getId());
        userAccountService.requirePasswordChange(user.getId(), true);

        User activated = userAccountService.getRequired(user.getId());
        activated.setEmailVerified(true);

        roleAssignmentService.assignSuperAdmin(user.getId());
        log.info("Bootstrap SUPER_ADMIN created userId={}", user.getId());
    }
}
