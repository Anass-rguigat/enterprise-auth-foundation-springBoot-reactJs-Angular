package com.company.application.authorization;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import com.company.application.administration.AdminSafeguardService;
import com.company.application.audit.AuditService;
import com.company.application.common.exception.ApplicationException;
import com.company.application.common.exception.ErrorCode;
import com.company.application.user.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleManagementServiceTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RolePermissionRepository rolePermissionRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AdminSafeguardService adminSafeguardService;
    @Mock
    private AuditService auditService;

    private RoleManagementService service;
    private final UUID actorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RoleManagementService(
                roleRepository,
                permissionRepository,
                rolePermissionRepository,
                userRoleRepository,
                userRepository,
                adminSafeguardService,
                auditService
        );
    }

    @Test
    void createRoleRejectsDuplicateCode() {
        when(roleRepository.findByCode("CUSTOM")).thenReturn(Optional.of(new Role()));

        assertThatThrownBy(() -> service.createRole(actorId, "CUSTOM", "Custom", null))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void deleteSystemRoleForbidden() {
        Role role = systemRole();
        when(roleRepository.findByCodeForUpdate(Role.SUPER_ADMIN)).thenReturn(Optional.of(role));

        assertThatThrownBy(() -> service.deleteRole(actorId, Role.SUPER_ADMIN))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
        verify(roleRepository, never()).delete(any());
    }

    @Test
    void deleteAssignedRoleConflicts() {
        Role role = customRole("SUPPORT");
        when(roleRepository.findByCodeForUpdate("SUPPORT")).thenReturn(Optional.of(role));
        when(userRoleRepository.countByRoleId(role.getId())).thenReturn(2L);

        assertThatThrownBy(() -> service.deleteRole(actorId, "SUPPORT"))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void deleteMapsFkViolationToConflict() {
        Role role = customRole("SUPPORT");
        when(roleRepository.findByCodeForUpdate("SUPPORT")).thenReturn(Optional.of(role));
        when(userRoleRepository.countByRoleId(role.getId())).thenReturn(0L);
        doThrow(new DataIntegrityViolationException("fk")).when(roleRepository).flush();

        assertThatThrownBy(() -> service.deleteRole(actorId, "SUPPORT"))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void attachPermissionIdempotentWhenAlreadyLinked() {
        Role role = customRole("SUPPORT");
        Permission permission = permission(Permissions.USER_READ);
        when(roleRepository.findByCodeForUpdate("SUPPORT")).thenReturn(Optional.of(role));
        when(permissionRepository.findByCode(Permissions.USER_READ)).thenReturn(Optional.of(permission));
        when(rolePermissionRepository.existsByRoleIdAndPermissionId(role.getId(), permission.getId()))
                .thenReturn(true);

        service.attachPermission(actorId, "SUPPORT", Permissions.USER_READ);

        verify(rolePermissionRepository, never()).save(any());
        verify(adminSafeguardService).assertRolePermissionMutable(role);
        verify(adminSafeguardService).assertCanGrantPermission(actorId, Permissions.USER_READ);
    }

    @Test
    void updateRejectsEmptyPatch() {
        assertThatThrownBy(() -> service.updateRole(actorId, "SUPPORT", null, null))
                .isInstanceOf(ApplicationException.class)
                .extracting(ex -> ((ApplicationException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_FAILED);
    }

    @Test
    void createPersistsNonSystemRole() {
        when(roleRepository.findByCode("SUPPORT")).thenReturn(Optional.empty());
        doAnswer(inv -> {
            Role role = inv.getArgument(0);
            if (role.getId() == null) {
                role.setId(UUID.randomUUID());
            }
            return role;
        }).when(roleRepository).save(any(Role.class));
        when(permissionRepository.findCodesByRoleId(any())).thenReturn(List.of());
        when(userRoleRepository.countByRoleId(any())).thenReturn(0L);

        var view = service.createRole(actorId, "SUPPORT", "Support", "helps");

        assertThat(view.code()).isEqualTo("SUPPORT");
        assertThat(view.systemRole()).isFalse();
        assertThat(view.permissionCodes()).isEmpty();
    }

    private static Role customRole(String code) {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode(code);
        role.setName(code);
        role.setSystemRole(false);
        return role;
    }

    private static Role systemRole() {
        Role role = new Role();
        role.setId(Role.SUPER_ADMIN_ID);
        role.setCode(Role.SUPER_ADMIN);
        role.setName("Super");
        role.setSystemRole(true);
        return role;
    }

    private static Permission permission(String code) {
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setCode(code);
        permission.setModule("user");
        permission.setDescription(code);
        return permission;
    }
}
