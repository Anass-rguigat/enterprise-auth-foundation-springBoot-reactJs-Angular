#!/bin/bash
# Creates migration owner, runtime app, and retention roles.
# Runs once on first PostgreSQL data directory initialization.
set -euo pipefail

: "${POSTGRES_DB:?}"
: "${POSTGRES_USER:?}"
: "${DB_OWNER_USER:?}"
: "${DB_OWNER_PASSWORD:?}"
: "${DB_APP_USER:?}"
: "${DB_APP_PASSWORD:?}"
: "${DB_RETENTION_USER:?}"
: "${DB_RETENTION_PASSWORD:?}"

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" <<EOSQL
-- Migration / table owner (Flyway). Not a superuser.
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_OWNER_USER}') THEN
    CREATE ROLE ${DB_OWNER_USER} LOGIN PASSWORD '${DB_OWNER_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_APP_USER}') THEN
    CREATE ROLE ${DB_APP_USER} LOGIN PASSWORD '${DB_APP_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_RETENTION_USER}') THEN
    CREATE ROLE ${DB_RETENTION_USER} LOGIN PASSWORD '${DB_RETENTION_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${DB_OWNER_USER}, ${DB_APP_USER}, ${DB_RETENTION_USER};

-- Extensions require CREATE on the database (superuser/bootstrap only).
-- Install here so Flyway's V1 CREATE EXTENSION IF NOT EXISTS is a no-op for auth_owner.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Owner manages objects in public schema
GRANT USAGE, CREATE ON SCHEMA public TO ${DB_OWNER_USER};
GRANT USAGE ON SCHEMA public TO ${DB_APP_USER}, ${DB_RETENTION_USER};
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- When auth_owner creates tables/sequences, runtime app gets intended DML automatically.
-- Audit tables must REVOKE UPDATE/DELETE FROM auth_app in their migration (Phase 12).
ALTER DEFAULT PRIVILEGES FOR ROLE ${DB_OWNER_USER} IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_APP_USER};

ALTER DEFAULT PRIVILEGES FOR ROLE ${DB_OWNER_USER} IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ${DB_APP_USER};

-- Retention role: no broad DML by default; Phase 12 grants narrow purge rights.
ALTER DEFAULT PRIVILEGES FOR ROLE ${DB_OWNER_USER} IN SCHEMA public
  GRANT SELECT ON TABLES TO ${DB_RETENTION_USER};
EOSQL

echo "Database roles initialized: ${DB_OWNER_USER}, ${DB_APP_USER}, ${DB_RETENTION_USER}"
