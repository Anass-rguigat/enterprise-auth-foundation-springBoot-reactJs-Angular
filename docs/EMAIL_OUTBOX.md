# Email outbox and password lifecycle (Phase 8)

## AES-GCM outbox

Sensitive emails (invitation, password reset, email verify) enqueue an `email_outbox` row in the same DB transaction as the business event.

| Field | Role |
|---|---|
| `payload_encrypted` / `nonce` / `kek_id` | AES-GCM ciphertext; fresh 12-byte nonce; key version |
| `to_address` / `to_address_normalized` | SMTP destination; also bound in AAD |
| `template_code` / `subject` | Non-sensitive metadata |
| `status` | `PENDING` → `SENT` or `FAILED` |

**AAD** = `outboxId|templateCode|recipientNormalized`. Changing `to_address` without re-encrypting causes decrypt authentication failure (cannot redirect a reset/invite payload).

After successful send: ciphertext fields are cleared. Failures retry with exponential backoff; after `max-attempts` the row is `FAILED` and ciphertext purged.

Configure `EMAIL_OUTBOX_KEK` (Base64 32-byte AES key). Local/dev may generate an ephemeral key with a warning.

## Password flows

| Endpoint | Notes |
|---|---|
| `POST /api/v1/auth/forgot-password` | Always **204** (enumeration-safe); emails only ACTIVE users with a password |
| `POST /api/v1/auth/reset-password` | Sets password, clears `must_change_password`, `tv++`, revokes all families |
| `POST /api/v1/me/password` | Authenticated change + notification email + session revoke |
| `POST /api/v1/me/email-change` | Stores `pending_email`, enqueues verify mail |
| `POST /api/v1/auth/verify-email` | Confirms pending email only if token matches `pending_email_normalized` |

Invitations also use the encrypted outbox (no direct SMTP from the invitation service).

## Login rehash

On successful login, if `PasswordEncoder.upgradeEncoding` is true, the hash is refreshed with current Argon2 params.
