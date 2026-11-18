package com.company.application.authorization;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.company.application.support.AbstractPostgresIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class PermissionSyncIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionQueryService permissionQueryService;

    @Test
    void catalogIsSyncedAndSuperAdminHoldsAllPermissions() {
        assertThat(permissionRepository.findByCode(Permissions.USER_INVITE)).isPresent();
        assertThat(permissionRepository.findByCode(Permissions.SECURITY_MANAGE)).isPresent();
        assertThat(permissionRepository.count()).isGreaterThanOrEqualTo(20);

        Role superAdmin = roleRepository.findByCode(Role.SUPER_ADMIN).orElseThrow();
        long grants = permissionRepository.findAll().stream()
                .filter(p -> rolePermissionRepository.existsByRoleIdAndPermissionId(superAdmin.getId(), p.getId()))
                .count();
        assertThat(grants).isEqualTo(permissionRepository.count());
        assertThat(permissionQueryService.roleExists(Role.SUPER_ADMIN)).isTrue();
    }
}
