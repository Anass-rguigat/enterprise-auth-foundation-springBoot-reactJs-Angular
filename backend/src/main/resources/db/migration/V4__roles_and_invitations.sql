-- Phase 7: minimal RBAC skeleton for SUPER_ADMIN bootstrap invariant + invitation tokens.
-- Full permission catalog and enforcement arrive in Phase 9.

CREATE TABLE roles (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         varchar(64) NOT NULL,
    name         varchar(120) NOT NULL,
    description  varchar(512),
    system_role  boolean NOT NULL DEFAULT FALSE,
    created_at   timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT roles_code_uq UNIQUE (code)
);

CREATE TABLE user_roles (
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id     uuid NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

COMMENT ON TABLE roles IS 'Authorization roles. SUPER_ADMIN seed supports bootstrap invariant; catalog expands in Phase 9.';
COMMENT ON TABLE user_roles IS 'User↔role assignments. Soft-delete/restore must never remove these rows.';

INSERT INTO roles (id, code, name, description, system_role)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'SUPER_ADMIN',
    'Super Administrator',
    'Break-glass / foundation administrator. Bootstrap creates at most one when count is zero.',
    TRUE
);

CREATE TABLE invitation_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash   varchar(64) NOT NULL,
    expires_at   timestamptz NOT NULL,
    used_at      timestamptz,
    revoked_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT invitation_tokens_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX idx_invitation_tokens_user_id ON invitation_tokens (user_id);
CREATE INDEX idx_invitation_tokens_user_active
    ON invitation_tokens (user_id)
    WHERE used_at IS NULL AND revoked_at IS NULL;

COMMENT ON COLUMN invitation_tokens.token_hash IS 'SHA-256 hex of raw invitation token; raw token never stored.';
COMMENT ON TABLE invitation_tokens IS 'Single-use invitation tokens. Resend revokes prior unused tokens for the user.';
