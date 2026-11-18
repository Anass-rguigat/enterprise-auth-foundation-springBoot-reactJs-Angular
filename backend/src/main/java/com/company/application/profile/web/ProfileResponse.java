package com.company.application.profile.web;

import java.util.UUID;

import com.company.application.profile.UserProfile;

public record ProfileResponse(
        UUID userId,
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
    public static ProfileResponse from(UserProfile profile) {
        return new ProfileResponse(
                profile.getUserId(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getPhone(),
                profile.getPreferredLanguage(),
                profile.getTimezone(),
                profile.getJobTitle(),
                profile.getDepartment(),
                profile.getOrganization(),
                profile.getCity(),
                profile.getCountry(),
                profile.getBio()
        );
    }
}
