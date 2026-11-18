package com.company.application.authorization.web;

import jakarta.validation.constraints.NotBlank;

public record AssignRolePermissionRequest(
        @NotBlank String permissionCode
) {
}
