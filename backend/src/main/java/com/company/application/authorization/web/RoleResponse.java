package com.company.application.authorization.web;

import java.time.Instant;
import java.util.List;

import com.company.application.authorization.RoleManagementService.RoleView;

public record RoleResponse(
        String code,
        String name,
        String description,
        boolean systemRole,
        Instant createdAt,
        List<String> permissionCodes,
        long assignedUserCount
) {
    public static RoleResponse from(RoleView view) {
        return new RoleResponse(
                view.code(),
                view.name(),
                view.description(),
                view.systemRole(),
                view.createdAt(),
                view.permissionCodes(),
                view.assignedUserCount()
        );
    }
}
