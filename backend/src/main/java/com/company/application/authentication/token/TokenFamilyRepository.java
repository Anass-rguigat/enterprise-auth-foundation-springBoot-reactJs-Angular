package com.company.application.authentication.token;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TokenFamilyRepository extends JpaRepository<TokenFamily, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from TokenFamily f where f.id = :id")
    Optional<TokenFamily> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select f from TokenFamily f
            where f.userId = :userId and f.revokedAt is null
            order by f.createdAt desc
            """)
    java.util.List<TokenFamily> findActiveByUserId(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update TokenFamily f
            set f.revokedAt = :now, f.revokeReason = :reason
            where f.userId = :userId and f.revokedAt is null
            """)
    int revokeAllActiveByUserId(
            @Param("userId") UUID userId,
            @Param("now") Instant now,
            @Param("reason") String reason
    );
}
