# Cookies, CSRF, CORS (Phase 6)

## Deployment model

**Default:** same-site sibling hosts — frontend `https://app.example.com`, API `https://api.example.com`.

Truly cross-site FE/API (`SameSite=None`) is out of v1 scope.

## Auth cookies

| Env | Access | Refresh |
|---|---|---|
| Local | `access_token` HttpOnly, Secure=false, SameSite=Lax | `refresh_token` HttpOnly, SameSite=Strict |
| Prod | `__Host-access` HttpOnly, Secure, Path=/, host-only | `__Host-refresh` HttpOnly, Secure, SameSite=Strict |

Clear on logout with **identical** Name, Path, Secure, SameSite, and host-only attributes.

## CSRF (sibling-host body bootstrap)

A host-only CSRF cookie on the API host **cannot** be read by JS on the FE host.

1. `GET /api/v1/auth/csrf` (credentialed) sets a host-only CSRF cookie on the API **and** returns `{ "token": "..." }` in the body.
2. Frontend stores the token **in memory** and sends `X-XSRF-TOKEN` on unsafe methods.
3. Spring Security `CookieCsrfTokenRepository` validates header against the API cookie (double-submit).
4. **Origin allowlist** on unsafe API methods; **Referer** fallback only when Origin is absent and Referer is allowlisted; otherwise **403 `ORIGIN_REJECTED`**.

CORS is **not** a CSRF defense.

### Protected

Unsafe methods including login, refresh, logout, logout-all, and later password/MFA/admin mutations.

### Local cookie name

`XSRF-TOKEN` (readable on API host only; FE uses body token). Prod: `__Host-XSRF-TOKEN`.

## CORS

- Explicit origins from `app.cors.allowed-origins` (local: `:4200` / `:5173`; prod: `CORS_ALLOWED_ORIGIN`).
- `allowCredentials=true`.
- **Never** `*` with credentials.
- Allowed header includes `X-XSRF-TOKEN`.

## Security headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Cache-Control defaults from Spring Security
- HSTS enabled in `prod` profile only

## Frontend checklist

1. On app init: `GET /api/v1/auth/csrf` with credentials → store `token` in memory.
2. Every unsafe request: `credentials: 'include'`, `X-XSRF-TOKEN: <memory token>`, browser sends API cookies automatically.
3. Do not put CSRF tokens in `localStorage` long-term.

Full SPA contract (single-flight refresh, cross-tab coordination, MFA login, `must_change_password`): see [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).
