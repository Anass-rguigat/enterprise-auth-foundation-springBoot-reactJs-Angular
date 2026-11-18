package com.company.application.mfa;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MfaChallengeRepository extends JpaRepository<MfaChallenge, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from MfaChallenge c where c.tokenHash = :hash")
    Optional<MfaChallenge> findByTokenHashForUpdate(@Param("hash") String hash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update MfaChallenge c
            set c.consumedAt = :now
            where c.userId = :userId and c.consumedAt is null
            """)
    int consumeAllActiveForUser(@Param("userId") UUID userId, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from MfaChallenge c where c.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
