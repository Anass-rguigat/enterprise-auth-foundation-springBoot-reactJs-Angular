package com.company.application.administration.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.company.application.user.User;
import com.company.application.user.UserStatus;

/**
 * Safe admin DTO — never exposes password hash, tokens, or secrets.
 */
public record AdminUserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phone,
        UserStatus status,
        boolean emailVerified,
        String pendingEmail,
        boolean mustChangePassword,
        long tokenVersion,
        long authzVersion,
        List<String> roles,
        List<String> permissions,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
    public static AdminUserResponse from(User user, List<String> roles, List<String> permissions) {
        String firstName = user.getProfile() != null ? user.getProfile().getFirstName() : null;
        String lastName = user.getProfile() != null ? user.getProfile().getLastName() : null;
        String phone = user.getProfile() != null ? user.getProfile().getPhone() : null;
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                firstName,
                lastName,
                phone,
                user.getStatus(),
                user.isEmailVerified(),
                user.getPendingEmail(),
                user.isMustChangePassword(),
                user.getTokenVersion(),
                user.getAuthzVersion(),
                roles,
                permissions,
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getDeletedAt()
        );
    }
}
