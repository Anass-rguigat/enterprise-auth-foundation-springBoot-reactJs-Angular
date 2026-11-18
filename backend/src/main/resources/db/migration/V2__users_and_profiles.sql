-- Phase 3: identity accounts and profiles.
-- No mfa_enabled column on users — MFA state lives in mfa_configurations (later phase).
-- Soft-delete/restore must never remove role assignments (user_roles arrives in Phase 9).

CREATE TABLE users (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email                       varchar(320) NOT NULL,
    email_normalized            varchar(320) NOT NULL,
    password_hash               varchar(255),
    status                      varchar(32) NOT NULL,
    email_verified              boolean NOT NULL DEFAULT FALSE,
    pending_email               varchar(320),
    pending_email_normalized    varchar(320),
    must_change_password        boolean NOT NULL DEFAULT FALSE,
    token_version               bigint NOT NULL DEFAULT 0,
    authz_version               bigint NOT NULL DEFAULT 0,
    failed_login_count          integer NOT NULL DEFAULT 0,
    locked_until                timestamptz,
    created_at                  timestamptz NOT NULL DEFAULT NOW(),
    updated_at                  timestamptz NOT NULL DEFAULT NOW(),
    deleted_at                  timestamptz,
    CONSTRAINT users_status_chk CHECK (status IN (
        'PENDING_ACTIVATION',
        'ACTIVE',
        'SUSPENDED',
        'DISABLED',
        'DELETED'
    )),
    CONSTRAINT users_email_normalized_uq UNIQUE (email_normalized)
);

CREATE UNIQUE INDEX uq_users_pending_email_normalized
    ON users (pending_email_normalized)
    WHERE pending_email_normalized IS NOT NULL;

CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_locked_until ON users (locked_until)
    WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN users.token_version IS 'Incremented to invalidate outstanding access JWTs (logout-all, password reset, suspend, etc.).';
COMMENT ON COLUMN users.authz_version IS 'Authorization change marker; permissions are loaded from DB each request.';
COMMENT ON COLUMN users.pending_email IS 'Replacement email awaiting verification; login email unchanged until verified.';
COMMENT ON COLUMN users.password_hash IS 'Nullable until invitation acceptance / password set.';

CREATE TABLE user_profiles (
    user_id              uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    first_name           varchar(100) NOT NULL,
    last_name            varchar(100) NOT NULL,
    phone                varchar(40),
    preferred_language   varchar(16),
    timezone             varchar(64),
    updated_at           timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Non-credential profile data; 1:1 with users. Does not store password, roles, or MFA secrets.';
