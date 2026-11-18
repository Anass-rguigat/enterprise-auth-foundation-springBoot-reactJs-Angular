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
import com.company.application.authorization.Role;
import com.company.application.authorization.RoleAssignmentService;
import com.company.application.authorization.RoleRepository;
import com.company.application.common.exception.ApplicationException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSafeguardServiceTest {

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
    private final UUID targetId = UUID.randomUUID();
    private final UUID roleId = UUID.randomUUID();

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
    void assertNotLastSuperAdminBlocksWhenSoleSuperAdmin() {
        when(roleAssignmentService.isSuperAdmin(targetId)).thenReturn(true);
        when(roleAssignmentService.countSuperAdmins()).thenReturn(1L);

        assertThatThrownBy(() -> service.assertNotLastSuperAdmin(targetId, "suspend"))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("last SUPER_ADMIN");
    }

    @Test
    void assertNotLastSuperAdminAllowsNonSuperAdmin() {
        when(roleAssignmentService.isSuperAdmin(targetId)).thenReturn(false);

        assertThatCode(() -> service.assertNotLastSuperAdmin(targetId, "suspend"))
                .doesNotThrowAnyException();
    }

    @Test
    void assertCanAssignRoleAllowsSuperAdminActor() {
        when(roleAssignmentService.isSuperAdmin(actorId)).thenReturn(true);

        assertThatCode(() -> service.assertCanAssignRole(actorId, "SUPPORT"))
                .doesNotThrowAnyException();
    }

    @Test
    void assertCanAssignRoleRejectsWhenRoleExceedsActorPermissions() {
        when(roleAssignmentService.isSuperAdmin(actorId)).thenReturn(false);
        Role role = new Role();
        role.setId(roleId);
        role.setCode("POWER_USER");
        when(roleRepository.findByCode("POWER_USER")).thenReturn(Optional.of(role));
        when(permissionRepository.findCodesByRoleId(roleId)).thenReturn(List.of("USER_READ", "USER_DELETE"));
        when(permissionQueryService.findPermissionCodes(actorId)).thenReturn(List.of("USER_READ"));

        assertThatThrownBy(() -> service.assertCanAssignRole(actorId, "POWER_USER"))
                .isInstanceOf(ApplicationException.class)
                .hasMessageContaining("exceed your own");
    }

    @Test
    void assertCanAssignRoleAllowsSubset() {
        when(roleAssignmentService.isSuperAdmin(actorId)).thenReturn(false);
        Role role = new Role();
        role.setId(roleId);
        role.setCode("READER");
        when(roleRepository.findByCode("READER")).thenReturn(Optional.of(role));
        when(permissionRepository.findCodesByRoleId(roleId)).thenReturn(List.of("USER_READ"));
        when(permissionQueryService.findPermissionCodes(actorId))
                .thenReturn(List.of("USER_READ", "USER_UPDATE"));

        assertThatCode(() -> service.assertCanAssignRole(actorId, "READER"))
                .doesNotThrowAnyException();
    }
}
