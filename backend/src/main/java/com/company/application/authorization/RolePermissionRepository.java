package com.company.application.authorization;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermission.Pk> {

    boolean existsByRoleIdAndPermissionId(UUID roleId, UUID permissionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from RolePermission rp where rp.roleId = :roleId and rp.permissionId = :permissionId")
    int deleteByRoleIdAndPermissionId(@Param("roleId") UUID roleId, @Param("permissionId") UUID permissionId);
}
