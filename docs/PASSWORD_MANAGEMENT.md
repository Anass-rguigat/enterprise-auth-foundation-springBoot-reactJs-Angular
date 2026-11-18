# Password management

Passwords are hashed with **Argon2id** (BouncyCastle). Never log or return password material.

## Flows

| Flow | Endpoint | Notes |
|---|---|---|
| Authenticated change | `POST /api/v1/me/password` | Requires current password; revokes sessions; optional notification mail |
| Forgot | `POST /api/v1/auth/forgot-password` | Always **204** (enumeration-safe) |
| Reset | `POST /api/v1/auth/reset-password` | Sets password, clears `must_change_password`, bumps `tv`, revokes families |
| Admin force reset | Admin user API | Requires `USER_RESET_PASSWORD` |
| Invite activation | Invitation accept | Sets initial password |

Reset and invite emails go through the **encrypted outbox** ([EMAIL_OUTBOX.md](EMAIL_OUTBOX.md) / [EMAIL.md](EMAIL.md)).

## `must_change_password`

When true, authenticated API access is limited to an allowlist (password change and a few auth helpers). Other routes return **403** `PASSWORD_CHANGE_REQUIRED`.

## Policy

Complexity and length rules are enforced in validation on set/change/reset. Failed login counters and lockouts live on the user record (see authentication login path).
