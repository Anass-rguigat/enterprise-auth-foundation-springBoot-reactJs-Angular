package com.company.application.mfa;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MfaEnrollmentRepository extends JpaRepository<MfaEnrollment, UUID> {

    Optional<MfaEnrollment> findByUserId(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from MfaEnrollment e where e.userId = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from MfaEnrollment e where e.expiresAt <= :now")
    int deleteExpired(@Param("now") Instant now);
}
