# JWT lifecycle

Access and refresh tokens are **ES256** JWTs delivered only as **HttpOnly** cookies. Claims and rotation rules are implemented in `authentication` / `authentication.jwt`.

## Access token

| Claim | Role |
|---|---|
| `sub` | User id |
| `jti` | Unique access id (denylist on logout) |
| `fid` | Token family id (checked every request) |
| `tv` | `users.token_version` at issue |
| `token_use` | Must be `access` |

Validated on each authenticated request: signature, `token_use`, expiry, JTI not denylisted, family active, user ACTIVE/unlocked, `tv` matches current user version.

| Failure class | HTTP |
|---|---|
| Bad/expired/mismatched identity claims | **401** |
| DB/infrastructure unavailable during checks | **503** (fail-closed) |

## Refresh token

| Claim | Role |
|---|---|
| `sub` | User id |
| `jti` | Refresh id (hashed at rest) |
| `fid` | Family id |
| `token_use` | Must be `refresh` |

Rotation is atomic (`FOR UPDATE` on family/token row):

1. Validate refresh JWT + DB hash match + family active.
2. Issue new refresh (hash stored) + new access.
3. Mark previous refresh used; update `last_used_at`.
4. **Commit transaction, then** `Set-Cookie` (never cookies before durable rotation).

**Reuse detection:** presenting an already-rotated refresh revokes the entire family and fails the request.

## Cookies

| Cookie | Typical use |
|---|---|
| `access_token` | API authorization |
| `refresh_token` | `/auth/refresh`, logout decision tree |
| CSRF cookie | Double-submit with `X-XSRF-TOKEN` |

Attributes: `HttpOnly`, `Secure` (non-local), `SameSite` per config, path scoped. See [COOKIE_AND_CSRF.md](COOKIE_AND_CSRF.md).

## Logout

- Matching access+refresh → revoke family, denylist access JTI, clear cookies, **204**.
- Decision tree for expired/invalid/mismatched cookies is documented in [AUTHENTICATION.md](AUTHENTICATION.md) and covered by Phase 14 tests.
- `logout-all` bumps `token_version`, revokes all families, denylists current access.

## Key material

ES256 private/public keys via env / files (see `.env.example`). Rotate by introducing a new key id and dual-verify window; never commit PEM material.
