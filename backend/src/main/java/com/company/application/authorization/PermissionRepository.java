package com.company.application.authorization;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByCode(String code);

    List<Permission> findByCodeIn(Collection<String> codes);

    @Query(value = """
            SELECT DISTINCT p.code
            FROM permissions p
            INNER JOIN role_permissions rp ON rp.permission_id = p.id
            INNER JOIN user_roles ur ON ur.role_id = rp.role_id
            WHERE ur.user_id = :userId
            ORDER BY p.code
            """, nativeQuery = true)
    List<String> findCodesByUserId(@Param("userId") UUID userId);

    @Query(value = """
            SELECT p.code
            FROM permissions p
            INNER JOIN role_permissions rp ON rp.permission_id = p.id
            WHERE rp.role_id = :roleId
            ORDER BY p.code
            """, nativeQuery = true)
    List<String> findCodesByRoleId(@Param("roleId") UUID roleId);
}
