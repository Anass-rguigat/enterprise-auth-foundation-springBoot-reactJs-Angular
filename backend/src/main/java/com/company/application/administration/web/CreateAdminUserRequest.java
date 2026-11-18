package com.company.application.administration.web;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Mass-assignment safe: no password, status, or security fields.
 * Invitation is always sent; optional roleCodes assigned after create.
 */
public record CreateAdminUserRequest(
        @NotBlank @Email String email,
        @NotBlank String firstName,
        @NotBlank String lastName,
        String phone,
        String preferredLanguage,
        String timezone,
        String jobTitle,
        String department,
        String organization,
        String city,
        String country,
        String bio,
        List<String> roleCodes
) {
}
