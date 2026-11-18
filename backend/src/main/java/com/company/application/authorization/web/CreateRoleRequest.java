package com.company.application.authorization.web;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateRoleRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Z][A-Z0-9_]{1,63}$", message = "code must match [A-Z][A-Z0-9_]{1,63}")
        String code,
        @NotBlank
        @Size(max = 120)
        String name,
        @Size(max = 512)
        String description,
        List<String> permissionCodes
) {
    public CreateRoleRequest(String code, String name, String description) {
        this(code, name, description, null);
    }
}
