# Security audit and retention (Phase 12)

## Table

`security_audit_logs` — append-only security events.

| Column | Notes |
|---|---|
| `event_type` / `module` | Stable codes (`AuditEventTypes` / `AuditModules`) |
| `actor_user_id` / `target_user_id` | Nullable FKs |
| `outcome` | `SUCCESS` / `FAILURE` / `DENIED` / `INFO` |
| `ip_hash` / `user_agent_hash` | SHA-256 hex; raw values never stored |
| `correlation_id` | From MDC / `X-Correlation-Id` |
| `metadata` | jsonb, non-sensitive only (no passwords/tokens/secrets) |
| `created_at` | UTC |

## Enforceable privileges

| Role | Rights on `security_audit_logs` |
|---|---|
| `auth_owner` | Owner (Flyway) |
| `auth_app` | **INSERT + SELECT** only (`REVOKE UPDATE, DELETE` in V8) |
| `auth_retention` | SELECT (default privileges); **no** table DELETE |

Runtime cannot bypass append-only via ownership because it does not own the table.

## Retention

```sql
SELECT purge_expired_security_audit_logs(365);
```

- `SECURITY DEFINER`, owner `auth_owner`
- Fixed `search_path = pg_catalog, public`
- Retention days validated **inside** the function (30–3650)
- `EXECUTE` granted only to `auth_retention` (revoked from `PUBLIC` and `auth_app`)

Optional in-app job (`app.audit.retention-enabled=true`) uses a second datasource as `auth_retention` and calls the function on a schedule. Disabled by default.

**Residual:** a PostgreSQL superuser can still tamper; document honestly.

## Query API

`GET /api/v1/admin/audit-logs` — requires `AUDIT_READ`.

Filters: `eventType`, `actorUserId`, `targetUserId`, `from`, `to` (pageable).

Response omits IP/UA hashes from the DTO (still queryable in DB for forensics); includes event metadata and correlation id.

## Covered events (selected)

Login success/failure/MFA required; MFA verify/recovery; logout / logout-all; MFA enroll/disable/admin reset; admin user lifecycle; role assign/remove; SUPER_ADMIN grant; password change/reset.
