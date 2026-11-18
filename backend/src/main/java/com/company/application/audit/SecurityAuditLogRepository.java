package com.company.application.audit;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {

    @Query("""
            select a from SecurityAuditLog a
            where (:eventType is null or a.eventType = :eventType)
              and (:hasActorFilter = false or a.actorUserId in :actorUserIds)
              and a.createdAt >= :from
              and a.createdAt <= :to
            """)
    Page<SecurityAuditLog> search(
            @Param("eventType") String eventType,
            @Param("hasActorFilter") boolean hasActorFilter,
            @Param("actorUserIds") Collection<UUID> actorUserIds,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );
}
