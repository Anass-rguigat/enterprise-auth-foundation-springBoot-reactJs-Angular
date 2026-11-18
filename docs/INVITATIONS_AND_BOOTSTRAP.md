# Invitations and bootstrap (Phase 7)

## Invitations

1. Admin creates a user in `PENDING_ACTIVATION` (service / later admin API).
2. `POST /api/v1/admin/users/{userId}/invitations` (SUPER_ADMIN) creates a hashed token, revokes prior unused invites, and emails an accept link (Mailpit locally).
3. User opens the FE link → `POST /api/v1/invitations/accept` with `{ "token", "password" }` (CSRF + Origin required).
4. On success: password set, status → `ACTIVE`, `email_verified=true`, token marked used → **204**. Client then logs in.

Resend = revoke active unused tokens for that user + issue a new one. Raw tokens are never stored or logged.

## Bootstrap SUPER_ADMIN

No public bootstrap HTTP endpoint.

| Condition | Behavior |
|---|---|
| `app.bootstrap.enabled=false` | No-op |
| enabled but email/password missing | **Fail startup** |
| enabled and `count(SUPER_ADMIN assignments) > 0` | No-op (safe if flag left on) |
| enabled and count = 0 | Create one ACTIVE admin, Argon2 hash, `must_change_password=true`, assign `SUPER_ADMIN` |

Count includes DISABLED/DELETED users that still hold the role. Use a PostgreSQL transaction advisory lock so concurrent starts create at most one.

Env: `BOOTSTRAP_ENABLED`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.

## Mandatory password change

`POST /api/v1/me/password` (allowlisted while `must_change_password`):

1. Verify current password; validate new password policy (min 12, letter + digit).
2. Clear `must_change_password`; bump `token_version`; revoke all token families.
3. Clear auth cookies → **204**; client must re-login.

## Minimal roles (Phase 7)

`roles` / `user_roles` seeded with `SUPER_ADMIN` for the bootstrap invariant. Full permission catalog and enforcement are Phase 9.
