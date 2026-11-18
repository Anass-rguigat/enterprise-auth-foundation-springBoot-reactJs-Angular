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
@Table(name = "role_permissions")
@IdClass(RolePermission.Pk.class)
public class RolePermission {

    @Id
    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Id
    @Column(name = "permission_id", nullable = false)
    private UUID permissionId;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @PrePersist
    void onCreate() {
        if (assignedAt == null) {
            assignedAt = Instant.now();
        }
    }

    public UUID getRoleId() {
        return roleId;
    }

    public void setRoleId(UUID roleId) {
        this.roleId = roleId;
    }

    public UUID getPermissionId() {
        return permissionId;
    }

    public void setPermissionId(UUID permissionId) {
        this.permissionId = permissionId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public static class Pk implements Serializable {
        private UUID roleId;
        private UUID permissionId;

        public Pk() {
        }

        public Pk(UUID roleId, UUID permissionId) {
            this.roleId = roleId;
            this.permissionId = permissionId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Pk pk)) {
                return false;
            }
            return Objects.equals(roleId, pk.roleId) && Objects.equals(permissionId, pk.permissionId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(roleId, permissionId);
        }
    }
}
