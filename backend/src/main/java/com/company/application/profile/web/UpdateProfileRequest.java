package com.company.application.profile.web;

/**
 * Mass-assignment safe profile fields only.
 */
public record UpdateProfileRequest(
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
