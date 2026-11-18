-- Phase 15: demo business module (Notes) proving extensibility.

CREATE TABLE demo_notes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       varchar(200) NOT NULL,
    body        text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT NOW(),
    updated_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_demo_notes_owner_user_id ON demo_notes (owner_user_id);
CREATE INDEX idx_demo_notes_updated_at ON demo_notes (updated_at DESC);

COMMENT ON TABLE demo_notes IS
    'Demo business module only. Safe to remove with package business.demo + this migration (after backup).';
