# MFA — optional TOTP + recovery (Phase 11)

Frontend login/MFA UX: [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).

## Source of truth

`mfa_configurations.enabled` — not a column on `users`.

## Login

1. Password succeeds.
2. If MFA enabled → issue opaque challenge (hash in `mfa_challenges`); set HttpOnly `mfa_challenge` cookie; respond **200** `{ "mfaRequired": true }` (no access/refresh).
3. Else → issue session cookies as usual (**204**).

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/mfa/verify` | MFA challenge cookie + CSRF |
| POST | `/api/v1/auth/mfa/recover` | MFA challenge cookie + CSRF |

Success clears the MFA cookie and sets access/refresh (**204**).

## Enrollment (authenticated)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/me/mfa` | Status |
| POST | `/api/v1/me/mfa/enroll` | Pending secret (AES-GCM); returns Base32 + otpauth URI once |
| DELETE | `/api/v1/me/mfa/enroll` | Cancel pending |
| POST | `/api/v1/me/mfa/confirm` | TOTP confirm → enable + recovery codes (shown once) |
| POST | `/api/v1/me/mfa/recovery-codes/regenerate` | Password + TOTP |
| DELETE | `/api/v1/me/mfa` | Disable with password + TOTP |

Expired pending enrollments are purged on next enroll start and by a scheduled job.

## Admin

`POST /api/v1/admin/users/{id}/mfa/reset` — requires `MFA_ADMIN_RESET`. Clears MFA state; **never** returns the secret.

## TOTP replay prevention

- Store `last_totp_step` on `mfa_configurations`.
- Accept the **largest** matching step in the drift window that is still `> last_totp_step`.
- Advance with conditional `UPDATE … WHERE last_totp_step IS NULL OR last_totp_step < :step` (`rowCount == 1`).
- Same TX as challenge consume / enrollment confirm / disable.

## Secrets at rest

AES-GCM; AAD = `userId|mfa_configuration` or `userId|mfa_enrollment`. Configure `MFA_SECRET_KEK` (Base64 32-byte) for durable keys.

## Rate limiting

In-memory per-user window for verify/recover (`app.mfa.max-verify-attempts-per-window`). Single-node only.
