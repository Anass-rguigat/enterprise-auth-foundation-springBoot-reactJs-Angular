package com.company.application.audit;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.application.audit.web.AuditEventTypeResponse;
import com.company.application.audit.web.AuditLogResponse;
import com.company.application.common.exception.ResourceNotFoundException;
import com.company.application.user.User;
import com.company.application.user.UserRepository;

@Service
public class AuditQueryService {

    private final SecurityAuditLogRepository repository;
    private final UserRepository userRepository;

    public AuditQueryService(SecurityAuditLogRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchEnriched(
            String eventType,
            String actorQuery,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        String type = eventType == null || eventType.isBlank() ? null : eventType.trim();
        Instant fromBound = from != null ? from : Instant.EPOCH;
        Instant toBound = to != null ? to : Instant.parse("9999-12-31T23:59:59Z");

        boolean hasActorFilter = actorQuery != null && !actorQuery.isBlank();
        Collection<UUID> actorUserIds = List.of(UUID.fromString("00000000-0000-0000-0000-000000000000"));
        if (hasActorFilter) {
            actorUserIds = resolveActorIds(actorQuery.trim());
            if (actorUserIds.isEmpty()) {
                return Page.empty(pageable);
            }
        }

        Page<SecurityAuditLog> page = repository.search(
                type,
                hasActorFilter,
                actorUserIds,
                fromBound,
                toBound,
                pageable
        );
        Map<UUID, UserRef> refs = loadUserRefs(page.getContent());
        return page.map(log -> toResponse(log, refs));
    }

    @Transactional(readOnly = true)
    public AuditLogResponse getById(UUID id) {
        SecurityAuditLog log = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Audit log not found: " + id));
        Map<UUID, UserRef> refs = loadUserRefs(List.of(log));
        return toResponse(log, refs);
    }

    @Transactional(readOnly = true)
    public List<AuditEventTypeResponse> listEventTypes() {
        return AuditEventCatalog.all().stream()
                .map(def -> new AuditEventTypeResponse(def.code(), def.title(), def.category()))
                .toList();
    }

    private Collection<UUID> resolveActorIds(String actorQuery) {
        return userRepository.search(actorQuery, null, Pageable.ofSize(100)).stream()
                .map(User::getId)
                .toList();
    }

    private AuditLogResponse toResponse(SecurityAuditLog log, Map<UUID, UserRef> refs) {
        UserRef actor = refs.get(log.getActorUserId());
        UserRef target = refs.get(log.getTargetUserId());
        return AuditLogResponse.from(
                log,
                actor == null ? null : actor.email(),
                actor == null ? null : actor.displayName(),
                target == null ? null : target.email(),
                target == null ? null : target.displayName()
        );
    }

    private Map<UUID, UserRef> loadUserRefs(Collection<SecurityAuditLog> logs) {
        Set<UUID> ids = new HashSet<>();
        for (SecurityAuditLog log : logs) {
            if (log.getActorUserId() != null) {
                ids.add(log.getActorUserId());
            }
            if (log.getTargetUserId() != null) {
                ids.add(log.getTargetUserId());
            }
        }
        Map<UUID, UserRef> refs = new HashMap<>();
        if (ids.isEmpty()) {
            return refs;
        }
        for (User user : userRepository.findAllByIdWithProfile(ids)) {
            String first = user.getProfile() == null ? null : user.getProfile().getFirstName();
            String last = user.getProfile() == null ? null : user.getProfile().getLastName();
            String display = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
            if (display.isBlank()) {
                display = user.getEmail();
            }
            refs.put(user.getId(), new UserRef(user.getEmail(), display));
        }
        return refs;
    }

    private record UserRef(String email, String displayName) {
    }
}
