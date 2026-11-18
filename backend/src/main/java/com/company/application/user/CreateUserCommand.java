package com.company.application.user;

public record CreateUserCommand(
        String email,
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
    /** Backward-compatible constructor for tests / call sites without extended profile fields. */
    public CreateUserCommand(
            String email,
            String firstName,
            String lastName,
            String phone,
            String preferredLanguage,
            String timezone
    ) {
        this(email, firstName, lastName, phone, preferredLanguage, timezone,
                null, null, null, null, null, null);
    }
}
