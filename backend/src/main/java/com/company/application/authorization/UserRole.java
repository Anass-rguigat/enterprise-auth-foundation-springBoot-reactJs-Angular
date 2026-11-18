package com.company.application.authorization;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_roles")
@IdClass(UserRole.Pk.class)
public class UserRole {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @PrePersist
    void onCreate() {
        if (assignedAt == null) {
            assignedAt = Instant.now();
        }
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public void setRoleId(UUID roleId) {
        this.roleId = roleId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public static class Pk implements Serializable {
        private UUID userId;
        private UUID roleId;

        public Pk() {
        }

        public Pk(UUID userId, UUID roleId) {
            this.userId = userId;
            this.roleId = roleId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Pk pk)) {
                return false;
            }
            return Objects.equals(userId, pk.userId) && Objects.equals(roleId, pk.roleId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, roleId);
        }
    }
}
