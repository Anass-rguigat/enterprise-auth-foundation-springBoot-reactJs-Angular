package com.company.application.administration.web;

import jakarta.validation.constraints.NotBlank;

public record GrantSuperAdminRequest(
        @NotBlank String password
) {
}
