package com.company.application.invitation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvitationTokenRepository extends JpaRepository<InvitationToken, UUID> {

    Optional<InvitationToken> findByTokenHash(String tokenHash);

    @Query("""
            select t from InvitationToken t
            where t.userId = :userId and t.usedAt is null and t.revokedAt is null
            """)
    List<InvitationToken> findActiveByUserId(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update InvitationToken t
            set t.revokedAt = :now
            where t.userId = :userId and t.usedAt is null and t.revokedAt is null
            """)
    int revokeActiveForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
