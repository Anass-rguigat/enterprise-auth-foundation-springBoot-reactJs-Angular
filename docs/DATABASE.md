# Database roles and Flyway (Phase 2)

## Identities

| Role | Purpose | Owns tables? |
|---|---|---|
| `auth_bootstrap` | Docker `POSTGRES_USER`; creates other roles on first init | N/A (bootstrap) |
| `auth_owner` | Flyway migrations; owns schema objects | **Yes** |
| `auth_app` | Spring Boot runtime datasource | **No** |
| `auth_retention` | Future audit retention job | **No** |

## Default privileges

Configured in [`docker/postgres/init/00-create-roles.sh`](../docker/postgres/init/00-create-roles.sh) (and mirrored in tests):

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_app;

ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO auth_app;

ALTER DEFAULT PRIVILEGES FOR ROLE auth_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO auth_retention;
```

Future tables created by Flyway (as `auth_owner`) automatically receive these grants.

**Audit tables (Phase 12):** V8 creates `security_audit_logs` and:

```sql
REVOKE UPDATE, DELETE ON security_audit_logs FROM auth_app;
```

so the runtime role cannot modify or delete audit rows despite default DML privileges.

Retention purge is `purge_expired_security_audit_logs(integer)` (`SECURITY DEFINER`, `EXECUTE` for `auth_retention` only). See [AUDIT.md](AUDIT.md).

## Spring configuration

- `spring.datasource.*` → `auth_app`
- `spring.flyway.user` / `password` → `auth_owner`
- Migrations: `classpath:db/migration`

## Baseline and identity tables

- `V1__baseline.sql` — `pgcrypto` + `app_schema_baseline`
- `V2__users_and_profiles.sql` — `users` + `user_profiles`

`users` includes `token_version`, `authz_version`, `must_change_password`, `pending_email` / `pending_email_normalized`. There is **no** `mfa_enabled` column.

Soft-delete sets `status=DELETED` and `deleted_at`. Restore returns `ACTIVE` and clears `deleted_at`. Soft-delete/restore **must not** remove `user_roles` rows (introduced in Phase 9); assignments remain and are therefore preserved across restore.

## Local reset

```bash
docker compose down -v   # destroys volume; re-runs init scripts on next up
```
