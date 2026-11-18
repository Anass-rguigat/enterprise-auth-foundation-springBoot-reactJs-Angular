package com.company.application.administration;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.application.authorization.PermissionQueryService;
import com.company.application.authorization.PermissionRepository;
import com.company.application.authorization.Permissions;
import com.company.application.authorization.Role;
import com.company.application.authorization.RoleAssignmentService;
import com.company.application.authorization.RoleRepository;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Phase 16 §4.3 escalation scenarios E1, E5–E7 (unit level).
 */
@ExtendWith(MockitoExtension.class)
class PrivilegeDelegationEscalationTest {

    @Mock
    private RoleAssignmentService roleAssignmentService;
    @Mock
    private PermissionQueryService permissionQueryService;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RoleRepository roleRepository;

    private AdminSafeguardService service;
    private final UUID actorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new AdminSafeguardService(
                roleAssignmentService,
                permissionQueryService,
                permissionRepository,
                roleRepository
        );
    }

    @Test
    void e1ActorWithoutUserDeleteCannotGrantUserDelete() {
        when(roleAssignmentService.isSuperAdmin(actorId)).thenReturn(false);
        when(permissionQueryService.findPermissionCodes(actorId)).thenReturn(List.of(Permissions.ROLE_ASSIGN_PERMISSION));

        assertThatThrownBy(() -> service.assertCanGrantPermission(actorId, Permissions.USER_DELETE))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void e5AssignRoleExceedingActorPermissionsForbidden() {
        when(roleAssignmentService.isSuperAdmin(actorId)).thenReturn(false);
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode("POWER");
        when(roleRepository.findByCode("POWER")).thenReturn(Optional.of(role));
        when(permissionRepository.findCodesByRoleId(role.getId()))
                .thenReturn(List.of(Permissions.USER_READ, Permissions.USER_DELETE));
        when(permissionQueryService.findPermissionCodes(actorId)).thenReturn(List.of(Permissions.USER_READ));

        assertThatThrownBy(() -> service.assertCanAssignRole(actorId, "POWER"))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("exceed your own");
    }

    @Test
    void e6SuperAdminCanGrantAnyPermission() {
        when(roleAssignmentService.isSuperAdmin(actorId)).thenReturn(true);

        assertThatCode(() -> service.assertCanGrantPermission(actorId, Permissions.USER_DELETE))
                .doesNotThrowAnyException();
    }

    @Test
    void e7SystemRolePermissionsImmutable() {
        Role role = new Role();
        role.setCode(Role.SUPER_ADMIN);
        role.setSystemRole(true);

        assertThatThrownBy(() -> service.assertRolePermissionMutable(role))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }
}
