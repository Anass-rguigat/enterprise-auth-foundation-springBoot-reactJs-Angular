package com.company.application.audit.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.company.application.audit.AuditQueryService;
import com.company.application.authorization.Permissions;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AdminAuditController {

    private final AuditQueryService auditQueryService;

    public AdminAuditController(AuditQueryService auditQueryService) {
        this.auditQueryService = auditQueryService;
    }

    @GetMapping("/event-types")
    @PreAuthorize("hasAuthority('" + Permissions.AUDIT_READ + "')")
    public List<AuditEventTypeResponse> eventTypes() {
        return auditQueryService.listEventTypes();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.AUDIT_READ + "')")
    public Page<AuditLogResponse> search(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return auditQueryService.searchEnriched(eventType, actor, from, to, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.AUDIT_READ + "')")
    public AuditLogResponse get(@PathVariable UUID id) {
        return auditQueryService.getById(id);
    }
}
