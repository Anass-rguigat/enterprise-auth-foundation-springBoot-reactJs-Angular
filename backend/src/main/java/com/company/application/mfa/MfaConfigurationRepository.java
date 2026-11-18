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

public interface MfaConfigurationRepository extends JpaRepository<MfaConfiguration, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from MfaConfiguration c where c.userId = :userId")
    Optional<MfaConfiguration> findByUserIdForUpdate(@Param("userId") UUID userId);

    Optional<MfaConfiguration> findByUserIdAndEnabledTrue(UUID userId);

    boolean existsByUserIdAndEnabledTrue(UUID userId);

    /**
     * Atomic last_totp_step advance. Returns 1 only when the step is strictly newer than the stored value.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update MfaConfiguration c
            set c.lastTotpStep = :step, c.updatedAt = :now
            where c.userId = :userId
              and (c.lastTotpStep is null or c.lastTotpStep < :step)
            """)
    int advanceLastTotpStep(
            @Param("userId") UUID userId,
            @Param("step") long step,
            @Param("now") Instant now
    );
}
