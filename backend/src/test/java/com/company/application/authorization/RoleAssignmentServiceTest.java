package com.company.application.authorization;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.company.application.administration.AdminSafeguardService;
import com.company.application.audit.AuditService;
import com.company.application.common.exception.ApplicationException;
import com.company.application.user.User;
import com.company.application.user.UserRepository;
import com.company.application.user.UserStatus;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleAssignmentServiceTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuditService auditService;
    @Mock
    private AdminSafeguardService adminSafeguardService;

    private RoleAssignmentService service;
    private final UUID actorId = UUID.randomUUID();
    private final UUID targetId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RoleAssignmentService(
                roleRepository,
                userRoleRepository,
                userRepository,
                passwordEncoder,
                auditService,
                adminSafeguardService
        );
    }

    @Test
    void assignRoleRejectsSuperAdminCode() {
        assertThatThrownBy(() -> service.assignRole(targetId, Role.SUPER_ADMIN))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("dedicated grant");
        verify(userRoleRepository, never()).save(any());
    }

    @Test
    void grantSuperAdminRequiresActorIsSuperAdmin() {
        when(userRoleRepository.existsByUserIdAndRoleId(actorId, Role.SUPER_ADMIN_ID)).thenReturn(false);

        assertThatThrownBy(() -> service.grantSuperAdmin(actorId, targetId, "pw"))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("Only an existing SUPER_ADMIN");
    }

    @Test
    void grantSuperAdminRequiresValidStepUpPassword() {
        when(userRoleRepository.existsByUserIdAndRoleId(actorId, Role.SUPER_ADMIN_ID)).thenReturn(true);
        User actor = new User();
        actor.setId(actorId);
        actor.setPasswordHash("hash");
        actor.setStatus(UserStatus.ACTIVE);
        when(userRepository.findById(actorId)).thenReturn(Optional.of(actor));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.grantSuperAdmin(actorId, targetId, "wrong"))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("Step-up");
    }

    @Test
    void cannotRemoveLastSuperAdmin() {
        when(roleRepository.findByCodeForUpdate(Role.SUPER_ADMIN)).thenReturn(Optional.of(superAdminRole()));
        when(userRoleRepository.existsByUserIdAndRoleId(actorId, Role.SUPER_ADMIN_ID)).thenReturn(true);
        when(userRoleRepository.countByRoleCode(Role.SUPER_ADMIN)).thenReturn(1L);
        when(userRoleRepository.existsByUserIdAndRoleId(targetId, Role.SUPER_ADMIN_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.removeRole(actorId, targetId, Role.SUPER_ADMIN))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("last SUPER_ADMIN");
    }

    private static Role superAdminRole() {
        Role role = new Role();
        role.setId(Role.SUPER_ADMIN_ID);
        role.setCode(Role.SUPER_ADMIN);
        role.setName("Super Administrator");
        role.setSystemRole(true);
        return role;
    }
}
