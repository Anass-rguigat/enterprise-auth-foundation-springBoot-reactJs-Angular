package com.company.application.business.demo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DemoNoteRepository extends JpaRepository<DemoNote, UUID> {

    List<DemoNote> findByOwnerUserIdOrderByUpdatedAtDesc(UUID ownerUserId);

    Optional<DemoNote> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);
}
