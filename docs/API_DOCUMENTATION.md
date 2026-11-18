# API documentation

Base path: `/api/v1`. Errors use RFC 7807 Problem Details (`errorCode`, optional `fields`).

All mutating browser calls require CSRF (`X-XSRF-TOKEN` + cookie) and an allowed `Origin` when applicable. See [COOKIE_AND_CSRF.md](COOKIE_AND_CSRF.md).

For the frozen Angular/React integration matrix (authz, DTOs, residual gaps, Phase 27 seed), see [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md).

## Public / auth

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/csrf` | CSRF token body + cookie |
| POST | `/auth/login` | Sets cookies or MFA challenge |
| POST | `/auth/refresh` | Rotate refresh/access |
| POST | `/auth/logout` | Always 204 |
| POST | `/auth/logout-all` | Authenticated; revoke all |
| GET | `/auth/me` | Current user + roles/permissions |
| POST | `/auth/forgot-password` | Enumeration-safe 204 |
| POST | `/auth/reset-password` | Token + new password |
| POST | `/auth/verify-email` | Confirm pending email |
| POST | `/auth/mfa/verify` | Complete MFA login challenge |
| GET | `/meta/info` | Phase/build marker |
| GET | `/actuator/health` | Health |

## Self-service

| Area | Prefix | Docs |
|---|---|---|
| Profile | `/me/profile` | USER_MANAGEMENT |
| Password / email | `/me/password`, `/me/email-change` | PASSWORD_MANAGEMENT |
| MFA | `/me/mfa/**` | MFA |
| Security sessions | `/me/security/**` | ADMIN_AND_SECURITY_DASHBOARD |
| Invitations accept | `/invitations/**` | INVITATIONS_AND_BOOTSTRAP |

## Administration

Requires granular permissions (`USER_*`, `AUDIT_READ`, …). See [ADMIN_AND_SECURITY_DASHBOARD.md](ADMIN_AND_SECURITY_DASHBOARD.md) and [AUTHORIZATION.md](AUTHORIZATION.md).

| Prefix | Purpose |
|---|---|
| `/admin/users` | User CRUD, status, invite, reset, revoke |
| `/admin/users/{id}/roles` | Role assign/remove (+ subset delegation) |
| `/admin/roles` | Role catalog CRUD + role↔permission (Phase 16) |
| `/admin/permissions` | Permission catalog (`PERMISSION_READ`) |
| `/admin/audit-logs` | Audit query |
| `/admin/mfa/**` | Admin MFA reset |

### Role catalog (Phase 16)

| Method | Path | Authority |
|---|---|---|
| GET | `/admin/roles` | `ROLE_READ` |
| GET | `/admin/roles/{roleCode}` | `ROLE_READ` |
| POST | `/admin/roles` | `ROLE_CREATE` |
| PATCH | `/admin/roles/{roleCode}` | `ROLE_UPDATE` |
| DELETE | `/admin/roles/{roleCode}` | `ROLE_DELETE` (`409` if assigned; system roles forbidden) |
| POST | `/admin/roles/{roleCode}/permissions` | `ROLE_ASSIGN_PERMISSION` + hold-`P` rule |
| DELETE | `/admin/roles/{roleCode}/permissions/{permissionCode}` | `ROLE_ASSIGN_PERMISSION` + hold-`P` rule |

Attach/detach are **idempotent 204**. See [AUTHORIZATION.md](AUTHORIZATION.md).

## Demo business module

| Method | Path | Authority |
|---|---|---|
| GET/POST | `/demo/notes` | `NOTE_READ` / `NOTE_CREATE` |
| GET/PUT/DELETE | `/demo/notes/{id}` | `NOTE_READ` / `NOTE_UPDATE` / `NOTE_DELETE` |

Owner-scoped. See [ADDING_BUSINESS_MODULES.md](ADDING_BUSINESS_MODULES.md).
