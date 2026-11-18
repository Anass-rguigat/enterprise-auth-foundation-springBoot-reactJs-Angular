# Admin APIs and security dashboard (Phase 10)

## Admin user administration

Base path: `/api/v1/admin/users`

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/` | `USER_CREATE` | Creates `PENDING_ACTIVATION`; optional invite |
| GET | `/` | `USER_READ` | Search `q` + optional `status`; pageable |
| GET | `/{id}` | `USER_READ` | Includes roles + permissions |
| PATCH | `/{id}` | `USER_UPDATE` | Profile basics only |
| POST | `/{id}/activate` | `USER_ACTIVATE` | |
| POST | `/{id}/suspend` | `USER_SUSPEND` | Blocks last SUPER_ADMIN; revokes sessions |
| POST | `/{id}/disable` | `USER_SUSPEND` | Blocks last SUPER_ADMIN; revokes sessions |
| DELETE | `/{id}` | `USER_DELETE` | Soft-delete; blocks last SUPER_ADMIN |
| POST | `/{id}/restore` | `USER_RESTORE` | Roles preserved |
| POST | `/{id}/force-password-reset` | `USER_RESET_PASSWORD` | Sets must-change + revoke + outbox reset |
| POST | `/{id}/revoke-sessions` | `USER_REVOKE_TOKENS` | Bumps `token_version` |
| DELETE | `/{id}/sessions/{familyId}` | `USER_REVOKE_TOKENS` | Single family |
| GET/PATCH | `/{id}/profile` | `PROFILE_READ` / `PROFILE_ADMIN_UPDATE` | Full profile fields |

Role endpoints remain as in [AUTHORIZATION.md](AUTHORIZATION.md). Ordinary assign additionally enforces **delegation**: non–SUPER_ADMIN actors may only assign roles whose permission set is a subset of their own.

## Mass-assignment guards

Admin create/update DTOs intentionally omit password, status, roles, `token_version`, MFA, and other security fields. Unknown JSON properties are ignored; they cannot change authorization state through these endpoints.

## Last SUPER_ADMIN safeguard

Suspend / disable / soft-delete of the sole remaining SUPER_ADMIN is rejected with `409 CONFLICT`.

## Self-service security dashboard

Base path: `/api/v1/me/security`

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Email/MFA/must-change flags + active session count |
| GET | `/sessions` | Metadata only: `familyId`, `createdAt`, `lastUsedAt`, `label`, `current` |
| DELETE | `/sessions/{familyId}` | Revoke another own session; current session must use logout |

`last_used_at` is updated on successful refresh (Phase 5). Responses never include JWTs, refresh tokens, or hashes.

Self profile: `/api/v1/me/profile` (GET/PATCH).
