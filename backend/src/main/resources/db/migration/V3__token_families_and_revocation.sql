-- Phase 4: token families, hashed refresh tokens, access JTI denylist.

CREATE TABLE token_families (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users (id),
    created_at       timestamptz NOT NULL DEFAULT NOW(),
    last_used_at     timestamptz,
    revoked_at       timestamptz,
    revoke_reason    varchar(64),
    label            varchar(120),
    user_agent_hash  varchar(64),
    ip_hash          varchar(64)
);

CREATE INDEX idx_token_families_user_id ON token_families (user_id);
CREATE INDEX idx_token_families_user_active
    ON token_families (user_id)
    WHERE revoked_at IS NULL;

COMMENT ON TABLE token_families IS 'Refresh token family / device session. Access JWT fid points here.';
COMMENT ON COLUMN token_families.label IS 'Descriptive metadata only; not verified device identity.';
COMMENT ON COLUMN token_families.last_used_at IS 'Updated on successful refresh only (Phase 5+).';

CREATE TABLE refresh_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id    uuid NOT NULL REFERENCES token_families (id),
    jti          uuid NOT NULL UNIQUE,
    token_hash   varchar(64) NOT NULL UNIQUE,
    expires_at   timestamptz NOT NULL,
    used_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens (family_id);

COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hex of raw refresh token; raw token never stored.';

CREATE TABLE revoked_access_tokens (
    jti          uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id),
    family_id    uuid REFERENCES token_families (id),
    expires_at   timestamptz NOT NULL,
    revoked_at   timestamptz NOT NULL DEFAULT NOW(),
    reason       varchar(64) NOT NULL
);

CREATE INDEX idx_revoked_access_tokens_expires_at ON revoked_access_tokens (expires_at);
