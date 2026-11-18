package com.company.application.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.company.application.authorization.PermissionQueryService;
import com.company.application.authorization.Role;
import com.company.application.authorization.RoleAssignmentService;
import com.company.application.authorization.RoleRepository;
import com.company.application.profile.ProfileService;
import com.company.application.profile.UpdateProfileCommand;
import com.company.application.support.AbstractPostgresIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class UserAccountServiceIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private ProfileService profileService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RoleAssignmentService roleAssignmentService;

    @Autowired
    private PermissionQueryService permissionQueryService;

    @Test
    void createActivateSuspendRestoreLifecycle() {
        User created = userAccountService.createPendingUser(new CreateUserCommand(
                "phase3@example.com",
                "Phase",
                "Three",
                "+10000000000",
                "en",
                "Europe/Paris"
        ));

        assertThat(created.getStatus()).isEqualTo(UserStatus.PENDING_ACTIVATION);
        assertThat(userRepository.findById(created.getId())).isPresent();

        User activated = userAccountService.activate(created.getId());
        assertThat(activated.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(activated.getTokenVersion()).isZero();

        User suspended = userAccountService.suspend(created.getId());
        assertThat(suspended.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(suspended.getTokenVersion()).isEqualTo(1L);

        User reactivated = userAccountService.activate(created.getId());
        assertThat(reactivated.getStatus()).isEqualTo(UserStatus.ACTIVE);

        User deleted = userAccountService.softDelete(created.getId());
        assertThat(deleted.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(deleted.getDeletedAt()).isNotNull();
        assertThat(deleted.getProfile().getFirstName()).isEqualTo("Phase");
        long tokenVersionAfterDelete = deleted.getTokenVersion();

        User restored = userAccountService.restore(created.getId());
        assertThat(restored.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(restored.getDeletedAt()).isNull();
        assertThat(restored.getProfile().getLastName()).isEqualTo("Three");
        assertThat(restored.getTokenVersion()).isEqualTo(tokenVersionAfterDelete);
    }

    @Test
    void profileUpdateDoesNotTouchSecurityFields() {
        User created = userAccountService.createPendingUser(new CreateUserCommand(
                "profile@example.com",
                "Ada",
                "Lovelace",
                null,
                null,
                null
        ));
        userAccountService.activate(created.getId());
        long tokenVersion = created.getTokenVersion();
        long authzVersion = created.getAuthzVersion();

        profileService.updateProfile(created.getId(), new UpdateProfileCommand(
                "Augusta",
                "Lovelace",
                "+111",
                "fr",
                "UTC",
                null,
                null,
                null,
                null,
                null,
                null
        ));

        User reloaded = userAccountService.getRequired(created.getId());
        assertThat(reloaded.getProfile().getFirstName()).isEqualTo("Augusta");
        assertThat(reloaded.getTokenVersion()).isEqualTo(tokenVersion);
        assertThat(reloaded.getAuthzVersion()).isEqualTo(authzVersion);
        assertThat(reloaded.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(reloaded.getPasswordHash()).isNull();
    }

    @Test
    void softDeleteAndRestorePreservesRoleAssignments() {
        Role reader = roleRepository.findByCode("RESTORE_READER").orElseGet(() -> {
            Role role = new Role();
            role.setCode("RESTORE_READER");
            role.setName("Restore Reader");
            role.setSystemRole(false);
            return roleRepository.save(role);
        });

        User created = userAccountService.createPendingUser(new CreateUserCommand(
                "restore-roles-" + System.nanoTime() + "@example.com",
                "Restore",
                "Roles",
                null,
                null,
                null
        ));
        userAccountService.activate(created.getId());
        roleAssignmentService.assignRole(created.getId(), reader.getCode());
        assertThat(permissionQueryService.findRoleCodes(created.getId())).contains(reader.getCode());

        userAccountService.softDelete(created.getId());
        assertThat(permissionQueryService.findRoleCodes(created.getId())).contains(reader.getCode());

        userAccountService.restore(created.getId());
        assertThat(permissionQueryService.findRoleCodes(created.getId())).containsExactly(reader.getCode());
        assertThat(userAccountService.getRequired(created.getId()).getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void pendingEmailSwapOnlyAfterConfirm() {
        User created = userAccountService.createPendingUser(new CreateUserCommand(
                "mail@example.com",
                "Mail",
                "User",
                null,
                null,
                null
        ));
        userAccountService.activate(created.getId());

        userAccountService.beginEmailChange(created.getId(), "next@example.com");
        User pending = userAccountService.getRequired(created.getId());
        assertThat(pending.getEmailNormalized()).isEqualTo("mail@example.com");
        assertThat(pending.getPendingEmailNormalized()).isEqualTo("next@example.com");

        userAccountService.confirmPendingEmail(created.getId());
        User confirmed = userAccountService.getRequired(created.getId());
        assertThat(confirmed.getEmailNormalized()).isEqualTo("next@example.com");
        assertThat(confirmed.getPendingEmail()).isNull();
        assertThat(confirmed.isEmailVerified()).isTrue();
    }

    @Test
    void illegalTransitionFails() {
        User created = userAccountService.createPendingUser(new CreateUserCommand(
                "bad-transition@example.com",
                "Bad",
                "Transition",
                null,
                null,
                null
        ));

        assertThatThrownBy(() -> userAccountService.softDelete(created.getId()))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }
}
