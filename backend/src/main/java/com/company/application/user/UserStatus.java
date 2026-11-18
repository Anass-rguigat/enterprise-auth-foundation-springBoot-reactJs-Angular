package com.company.application.user;

import java.util.EnumSet;
import java.util.Set;

public enum UserStatus {
    PENDING_ACTIVATION,
    ACTIVE,
    SUSPENDED,
    DISABLED,
    DELETED;

    private static final Set<UserStatus> FROM_PENDING = EnumSet.of(ACTIVE);
    private static final Set<UserStatus> FROM_ACTIVE = EnumSet.of(SUSPENDED, DISABLED, DELETED);
    private static final Set<UserStatus> FROM_SUSPENDED = EnumSet.of(ACTIVE, DELETED);
    private static final Set<UserStatus> FROM_DISABLED = EnumSet.of(ACTIVE, DELETED);
    private static final Set<UserStatus> FROM_DELETED = EnumSet.of(ACTIVE);

    public boolean canTransitionTo(UserStatus target) {
        if (target == null || target == this) {
            return false;
        }
        return switch (this) {
            case PENDING_ACTIVATION -> FROM_PENDING.contains(target);
            case ACTIVE -> FROM_ACTIVE.contains(target);
            case SUSPENDED -> FROM_SUSPENDED.contains(target);
            case DISABLED -> FROM_DISABLED.contains(target);
            case DELETED -> FROM_DELETED.contains(target);
        };
    }

    public boolean requiresTokenVersionBump() {
        return this == SUSPENDED || this == DISABLED || this == DELETED;
    }

    public boolean allowsLogin() {
        return this == ACTIVE;
    }
}
