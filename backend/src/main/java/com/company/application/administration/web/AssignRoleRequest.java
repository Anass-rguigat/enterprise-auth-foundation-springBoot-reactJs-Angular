package com.company.application.administration.web;

import jakarta.validation.constraints.NotBlank;

public record AssignRoleRequest(
        @NotBlank String roleCode
) {
}
