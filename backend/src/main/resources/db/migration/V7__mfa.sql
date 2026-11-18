-- Phase 11: optional TOTP MFA + recovery codes + opaque login challenges.

CREATE TABLE mfa_configurations (
    user_id          uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    secret_encrypted bytea NOT NULL,
    nonce            bytea NOT NULL,
    kek_id           varchar(64) NOT NULL,
    enabled          boolean NOT NULL DEFAULT FALSE,
    enabled_at       timestamptz,
    last_totp_step   bigint,
    created_at       timestamptz NOT NULL DEFAULT NOW(),
    updated_at       timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mfa_configurations IS
    'Source of truth for MFA. enabled=true means TOTP is required at login.';
COMMENT ON COLUMN mfa_configurations.secret_encrypted IS
    'AES-GCM ciphertext of TOTP shared secret. AAD = user_id|mfa_configuration.';
COMMENT ON COLUMN mfa_configurations.last_totp_step IS
    'Last successfully accepted TOTP time-step (counter). Used for replay prevention.';

CREATE TABLE mfa_enrollments (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    secret_encrypted bytea NOT NULL,
    nonce            bytea NOT NULL,
    kek_id           varchar(64) NOT NULL,
    expires_at       timestamptz NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT mfa_enrollments_user_id_uq UNIQUE (user_id)
);

CREATE INDEX idx_mfa_enrollments_expires_at ON mfa_enrollments (expires_at);

COMMENT ON TABLE mfa_enrollments IS
    'Pending TOTP enrollment. Deleted on confirm/cancel/expiry. Secret never logged.';
COMMENT ON COLUMN mfa_enrollments.secret_encrypted IS
    'AES-GCM ciphertext. AAD = user_id|mfa_enrollment.';

CREATE TABLE mfa_recovery_codes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash  varchar(64) NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT mfa_recovery_codes_code_hash_uq UNIQUE (code_hash)
);

CREATE INDEX idx_mfa_recovery_codes_user_id ON mfa_recovery_codes (user_id);

COMMENT ON COLUMN mfa_recovery_codes.code_hash IS
    'SHA-256 hex of normalized recovery code; raw code shown once then discarded.';

CREATE TABLE mfa_challenges (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash      varchar(64) NOT NULL,
    expires_at      timestamptz NOT NULL,
    consumed_at     timestamptz,
    user_agent_hash varchar(64),
    ip_hash         varchar(64),
    created_at      timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT mfa_challenges_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX idx_mfa_challenges_user_active
    ON mfa_challenges (user_id)
    WHERE consumed_at IS NULL;

COMMENT ON TABLE mfa_challenges IS
    'Opaque MFA login challenges. Raw token only in HttpOnly cookie; hash stored here.';
COMMENT ON COLUMN mfa_challenges.token_hash IS 'SHA-256 hex of raw challenge token.';
