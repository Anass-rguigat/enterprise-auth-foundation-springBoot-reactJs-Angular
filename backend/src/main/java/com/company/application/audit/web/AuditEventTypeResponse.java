package com.company.application.audit.web;

public record AuditEventTypeResponse(
        String code,
        String title,
        String category
) {
}
