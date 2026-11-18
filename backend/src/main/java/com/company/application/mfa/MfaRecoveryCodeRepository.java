package com.company.application.mfa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, UUID> {

    List<MfaRecoveryCode> findByUserIdAndUsedAtIsNull(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from MfaRecoveryCode c where c.codeHash = :hash and c.usedAt is null")
    Optional<MfaRecoveryCode> findUnusedByHashForUpdate(@Param("hash") String hash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from MfaRecoveryCode c where c.userId = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

    long countByUserIdAndUsedAtIsNull(UUID userId);
}
