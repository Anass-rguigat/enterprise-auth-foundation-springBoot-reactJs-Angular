package com.company.application.email;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update EmailVerificationToken t
            set t.revokedAt = :now
            where t.userId = :userId and t.usedAt is null and t.revokedAt is null
            """)
    int revokeActiveForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
