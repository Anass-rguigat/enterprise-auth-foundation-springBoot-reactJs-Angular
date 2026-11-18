package com.company.application.administration.web;

/**
 * Mass-assignment safe: profile basics only (no email/status/roles/password).
 */
public record UpdateAdminUserRequest(
        String firstName,
        String lastName,
        String phone,
        String preferredLanguage,
        String timezone,
        String jobTitle,
        String department,
        String organization,
        String city,
        String country,
        String bio
) {
}
