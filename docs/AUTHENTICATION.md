# Authentication (Phases 4–6)

## Status

Phase 4–6 deliver:

- ES256 access/refresh JWT creation and validation (`token_use` enforced)
- HttpOnly `access_token` / `refresh_token` cookies
- `GET /api/v1/auth/csrf` — body token + host-only CSRF cookie
- `POST /api/v1/auth/login` (CSRF + Origin required)
- `POST /api/v1/auth/refresh` — atomic rotation, `last_used_at`, TX then Set-Cookie
- `POST /api/v1/auth/logout` — dual-path decision tree, always **204** + clear cookies
- `POST /api/v1/auth/logout-all` — bump `token_version`, revoke all families, denylist current access
- `GET /api/v1/auth/me`
- STATELESS Spring Security + CSRF, CORS, Origin allowlist, security headers
- Fail-closed request checks: signature/`token_use`, JTI denylist, token family, user status + `token_version`
- `must_change_password` backend allowlist → `403 PASSWORD_CHANGE_REQUIRED`

See also [COOKIE_AND_CSRF.md](COOKIE_AND_CSRF.md) and [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).

MFA challenge at login (when enabled): see [MFA.md](MFA.md). `/auth/me` includes `mfaEnabled` and RBAC authorities.

## Access JWT claims

| Claim | Meaning |
|---|---|
| `sub` | User UUID |
| `jti` | Access token id |
| `fid` | Token family id |
| `tv` | `users.token_version` at issue |
| `token_use` | `access` |
| `iss` / `aud` / `iat` / `nbf` / `exp` | Standard |

Refresh JWTs use `token_use=refresh` and omit `tv`.

## Login

1. Normalize email; verify Argon2id password.
2. Require `ACTIVE` and unlocked.
3. Create `token_families` row + hashed refresh token row.
4. Issue access + refresh JWTs; set cookies **after** DB commit.

Generic error: `Invalid email or password`.

## Refresh

1. Parse refresh JWT (`token_use=refresh`).
2. `SELECT … FOR UPDATE` on the token family.
3. Match stored refresh hash; unused; family active; user `ACTIVE`.
4. Reuse (`used_at` already set) → revoke family → **401**.
5. Mark old refresh used; set `token_families.last_used_at`; issue new refresh + access.
6. **Commit**, then Set-Cookie. Never set cookies on a failed TX.

Access JWTs are rejected on this endpoint. Refresh/logout skip the JWT access filter so an expired access cookie does not block them.

## Logout (current device)

Always **204 No Content** and clears auth cookies (same Path/Secure/HttpOnly/SameSite as create).

Credentials are evaluated **independently**:

1. If both refresh and access are independently valid but disagree on `sub` and/or `fid` → **revoke neither**; clear cookies; 204.
2. Else if refresh is valid → revoke that refresh family; denylist access `jti` only when access is parseable and its `sub`/`fid` match the revoked family; clear cookies; 204.
3. Else if access is independently valid → denylist that access `jti`; revoke that access family; clear cookies; 204.
4. Else → revoke nothing; clear cookies; 204.

An invalid refresh alone never authorizes family revocation.

## Logout-all

Requires authenticated access. Atomically:

1. `users.token_version++`
2. Revoke all active families for the user (`LOGOUT_ALL`)
3. Denylist current access `jti` when parseable and matching `sub`
4. Clear cookies; **204**

## `must_change_password` allowlist

`/api/v1/auth/me`, `/api/v1/auth/logout`, `/api/v1/auth/logout-all`, `/api/v1/auth/refresh`, `/api/v1/auth/csrf`, `/api/v1/me/password`.
