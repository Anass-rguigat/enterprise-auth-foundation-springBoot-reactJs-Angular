-- Phase 2 baseline. Domain tables are added in later migrations by the owner role.
-- Default privileges for the runtime role are configured in docker/postgres/init (and mirrored in tests).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_schema_baseline (
    id          boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
    initialized_at timestamptz NOT NULL DEFAULT NOW(),
    phase       text NOT NULL DEFAULT '2'
);

COMMENT ON TABLE app_schema_baseline IS
    'Phase 2 baseline marker. Application domain tables are introduced in subsequent Flyway versions.';

INSERT INTO app_schema_baseline (id, phase) VALUES (TRUE, '2');
