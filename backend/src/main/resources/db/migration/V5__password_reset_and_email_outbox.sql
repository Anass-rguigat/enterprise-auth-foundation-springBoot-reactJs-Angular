-- Phase 8: password reset / email verification tokens + AES-GCM encrypted email outbox.

CREATE TABLE password_reset_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash   varchar(64) NOT NULL,
    expires_at   timestamptz NOT NULL,
    used_at      timestamptz,
    revoked_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT password_reset_tokens_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_user_active
    ON password_reset_tokens (user_id)
    WHERE used_at IS NULL AND revoked_at IS NULL;

COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hex of raw reset token; raw token never stored.';

CREATE TABLE email_verification_tokens (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash       varchar(64) NOT NULL,
    email_normalized varchar(320) NOT NULL,
    expires_at       timestamptz NOT NULL,
    used_at          timestamptz,
    revoked_at       timestamptz,
    created_at       timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT email_verification_tokens_token_hash_uq UNIQUE (token_hash)
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);

COMMENT ON COLUMN email_verification_tokens.email_normalized IS
    'Must match users.pending_email_normalized at verify time; binds token to pending address.';

CREATE TABLE email_outbox (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    to_address         varchar(320) NOT NULL,
    to_address_normalized varchar(320) NOT NULL,
    subject            varchar(200) NOT NULL,
    template_code      varchar(64) NOT NULL,
    payload_encrypted  bytea,
    nonce              bytea,
    kek_id             varchar(64),
    status             varchar(16) NOT NULL DEFAULT 'PENDING',
    attempts           integer NOT NULL DEFAULT 0,
    next_attempt_at    timestamptz NOT NULL DEFAULT NOW(),
    last_error         varchar(512),
    created_at         timestamptz NOT NULL DEFAULT NOW(),
    sent_at            timestamptz,
    CONSTRAINT email_outbox_status_chk CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX idx_email_outbox_pending
    ON email_outbox (next_attempt_at)
    WHERE status = 'PENDING';

COMMENT ON TABLE email_outbox IS
    'Transactional email outbox. Sensitive link payloads stored AES-GCM encrypted; cleared after successful send.';
COMMENT ON COLUMN email_outbox.payload_encrypted IS
    'AES-GCM ciphertext. AAD = outbox_id|template_code|to_address_normalized. Null after SENT.';
COMMENT ON COLUMN email_outbox.nonce IS 'Fresh 12-byte GCM nonce per encryption; never reused with same KEK.';
COMMENT ON COLUMN email_outbox.kek_id IS 'Key version used to encrypt payload_encrypted.';
