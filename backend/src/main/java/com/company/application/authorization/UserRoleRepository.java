package com.company.application.authorization;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRole.Pk> {

    @Query(value = """
            SELECT COUNT(*) FROM user_roles ur
            INNER JOIN roles r ON r.id = ur.role_id
            WHERE r.code = :code
            """, nativeQuery = true)
    long countByRoleCode(@Param("code") String code);

    @Query(value = """
            SELECT r.code FROM user_roles ur
            INNER JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :userId
            ORDER BY r.code
            """, nativeQuery = true)
    List<String> findRoleCodesByUserId(@Param("userId") UUID userId);

    boolean existsByUserIdAndRoleId(UUID userId, UUID roleId);

    void deleteByUserIdAndRoleId(UUID userId, UUID roleId);

    long countByRoleId(UUID roleId);

    @Query(value = """
            SELECT ur.user_id FROM user_roles ur
            WHERE ur.role_id = :roleId
            """, nativeQuery = true)
    List<UUID> findUserIdsByRoleId(@Param("roleId") UUID roleId);
}
