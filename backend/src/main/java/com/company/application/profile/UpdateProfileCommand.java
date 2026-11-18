package com.company.application.profile;

public record UpdateProfileCommand(
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
