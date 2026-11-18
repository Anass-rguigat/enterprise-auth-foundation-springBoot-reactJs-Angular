-- Phase 9: permission catalog + role↔permission assignments.
-- Codes are synced from application catalog at startup (UPSERT; never auto-delete assigned).

CREATE TABLE permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        varchar(64) NOT NULL,
    module      varchar(64) NOT NULL,
    description varchar(512) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT NOW(),
    updated_at  timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT permissions_code_uq UNIQUE (code)
);

CREATE INDEX idx_permissions_module ON permissions (module);

CREATE TABLE role_permissions (
    role_id       uuid NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    assigned_at   timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);

COMMENT ON TABLE permissions IS 'Executable permission codes. Source of truth is the application catalog; DB is synced at startup.';
COMMENT ON TABLE role_permissions IS 'Role↔permission grants. Effective user permissions = union across assigned roles; loaded each request (no cache).';
