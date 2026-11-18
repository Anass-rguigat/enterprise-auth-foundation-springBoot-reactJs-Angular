package com.company.application.authorization;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * UPSERTs catalog permissions into the DB and ensures SUPER_ADMIN holds every catalog permission.
 * Never auto-deletes permission rows (orphans may remain if removed from code).
 */
@Component
@Order(50)
public class PermissionSyncService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PermissionSyncService.class);

    private final List<PermissionCatalogContributor> contributors;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public PermissionSyncService(
            List<PermissionCatalogContributor> contributors,
            PermissionRepository permissionRepository,
            RoleRepository roleRepository,
            RolePermissionRepository rolePermissionRepository
    ) {
        this.contributors = contributors;
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Map<String, PermissionDef> catalog = new LinkedHashMap<>();
        for (PermissionCatalogContributor contributor : contributors) {
            for (PermissionDef def : contributor.permissions()) {
                catalog.put(def.code(), def);
            }
        }

        int created = 0;
        int updated = 0;
        for (PermissionDef def : catalog.values()) {
            Permission existing = permissionRepository.findByCode(def.code()).orElse(null);
            if (existing == null) {
                Permission permission = new Permission();
                permission.setCode(def.code());
                permission.setModule(def.module());
                permission.setDescription(def.description());
                permissionRepository.save(permission);
                created++;
            } else if (!existing.getModule().equals(def.module())
                    || !existing.getDescription().equals(def.description())) {
                existing.setModule(def.module());
                existing.setDescription(def.description());
                updated++;
            }
        }

        Role superAdmin = roleRepository.findByCode(Role.SUPER_ADMIN)
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role missing"));
        int granted = 0;
        for (Permission permission : permissionRepository.findAll()) {
            if (!rolePermissionRepository.existsByRoleIdAndPermissionId(superAdmin.getId(), permission.getId())) {
                RolePermission link = new RolePermission();
                link.setRoleId(superAdmin.getId());
                link.setPermissionId(permission.getId());
                rolePermissionRepository.save(link);
                granted++;
            }
        }

        log.info(
                "Permission catalog sync complete: catalogSize={} created={} updated={} superAdminGrants={}",
                catalog.size(),
                created,
                updated,
                granted
        );
    }
}
