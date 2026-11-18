# User management (Phase 3)

## Status lifecycle

```
PENDING_ACTIVATION → ACTIVE ⇄ SUSPENDED
                   ACTIVE → DISABLED → ACTIVE
                   ACTIVE|SUSPENDED|DISABLED → DELETED → ACTIVE (restore)
```

- Login is allowed only for `ACTIVE` (enforced in later auth phases).
- Entering `SUSPENDED`, `DISABLED`, or `DELETED` increments `token_version`.
- Soft-delete sets `deleted_at` and keeps the profile row.
- Restore clears `deleted_at` and returns to `ACTIVE` without removing role assignments (when `user_roles` exists in Phase 9+).

## Email change

1. Store the new address in `pending_email` / `pending_email_normalized`.
2. Login email stays unchanged until confirmation.
3. Confirm swaps email and clears pending fields.

## Packages

- `com.company.application.user` — account entity, status, `UserAccountService`
- `com.company.application.profile` — profile entity, `ProfileService`

Admin HTTP APIs (create/list/status/reset/sessions) and self-service profile/security dashboard are in Phase 10 — see [ADMIN_AND_SECURITY_DASHBOARD.md](ADMIN_AND_SECURITY_DASHBOARD.md).
