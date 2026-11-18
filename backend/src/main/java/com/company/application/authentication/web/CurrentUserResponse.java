package com.company.application.authentication.web;

import java.util.List;
import java.util.UUID;

import com.company.application.user.UserStatus;

public record CurrentUserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        UserStatus status,
        boolean emailVerified,
        boolean mustChangePassword,
        boolean mfaEnabled,
        List<String> roles,
        List<String> permissions,
        long tokenVersion,
        long authzVersion
) {
}
