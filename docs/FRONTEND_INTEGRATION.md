# Frontend integration (Phase 13)

Guide for Angular / React (or any SPA) against this API. Auth is **cookie-based**: the browser holds HttpOnly access/refresh (and MFA challenge) cookies; the SPA never stores JWTs in `localStorage`.

**Frozen endpoint/DTO/authz matrix:** [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md) (Phase 17) — both SPAs implement this contract; do not invent APIs.

**SPA guides:** [ANGULAR.md](ANGULAR.md) · [REACT.md](REACT.md) · Equivalence [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md) · Tests [FRONTEND_TESTING.md](FRONTEND_TESTING.md).

Related: [COOKIE_AND_CSRF.md](COOKIE_AND_CSRF.md), [AUTHENTICATION.md](AUTHENTICATION.md), [MFA.md](MFA.md), [AUTHORIZATION.md](AUTHORIZATION.md).

## Deployment topologies

| Mode | FE origin | API origin | Notes |
|---|---|---|---|
| **Local** | `http://localhost:4200` or `:5173` | `http://localhost:8080` | CORS allowlist; cookies `Secure=false`; CSRF cookie `XSRF-TOKEN` |
| **Prod (default)** | `https://app.example.com` | `https://api.example.com` | Same-site **siblings**; `__Host-*` cookies; CSRF `__Host-XSRF-TOKEN` |

Truly cross-site FE/API (`SameSite=None`) is **out of v1 scope**.

Always call the API with `credentials: 'include'` so the browser attaches API-host cookies.

---

## 1. CSRF: body → memory → header

A host-only CSRF cookie on the API host **cannot** be read by JS on the FE host. Bootstrap:

1. On app boot (and after full page reload):  
   `GET /api/v1/auth/csrf` with credentials.
2. Response body: `{ "token": "<csrf>" }` plus Set-Cookie of the host-only CSRF cookie on the API.
3. Store `token` **only in memory** (module variable / injectable service). Do **not** persist it in `localStorage` / `sessionStorage` for long-term use.
4. On every unsafe method (`POST` / `PUT` / `PATCH` / `DELETE`), send:
   - `X-XSRF-TOKEN: <memory token>`
   - `credentials: 'include'`
   - `Content-Type: application/json` when there is a body
5. Optionally send `X-Correlation-Id` (UUID); the API echoes it and attaches it to audit rows.

If CSRF fails, expect **403**. If Origin is missing/not allowlisted on unsafe methods, expect **403** with `errorCode: ORIGIN_REJECTED`.

```ts
// csrf.ts — keep in memory only
let csrfToken: string | null = null;

export async function bootstrapCsrf(apiBase: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('CSRF bootstrap failed');
  const body = (await res.json()) as { token: string };
  csrfToken = body.token;
}

export function getCsrfToken(): string {
  if (!csrfToken) throw new Error('CSRF token not bootstrapped');
  return csrfToken;
}
```

Re-bootstrap CSRF after a long idle if mutations start failing with 403 CSRF (token/cookie rotation).

---

## 2. Shared API client contract

```ts
type ApiError = {
  title?: string;
  detail?: string;
  errorCode?: string;
  status?: number;
};

export async function apiFetch(
  apiBase: string,
  path: string,
  init: RequestInit & { csrf?: boolean } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const method = (init.method ?? 'GET').toUpperCase();
  const unsafe = !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method);
  if (unsafe || init.csrf) {
    headers.set('X-XSRF-TOKEN', getCsrfToken());
  }
  if (!headers.has('X-Correlation-Id')) {
    headers.set('X-Correlation-Id', crypto.randomUUID());
  }

  return fetch(`${apiBase}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });
}
```

Parse Problem Details on errors (`errorCode`, `detail`). Do not surface stack traces.

---

## 3. Login and MFA

### Happy path (no MFA)

1. Bootstrap CSRF.
2. `POST /api/v1/auth/login` `{ email, password }` → **204** + `Set-Cookie` access/refresh.
3. `GET /api/v1/auth/me` → user, `mustChangePassword`, `mfaEnabled`, `roles`, `permissions`.

### MFA required

1. Login returns **200** `{ "mfaRequired": true }` and sets HttpOnly `mfa_challenge` (no access/refresh).
2. Prompt for TOTP (or recovery code).
3. `POST /api/v1/auth/mfa/verify` `{ "code": "123456" }` **or**  
   `POST /api/v1/auth/mfa/recover` `{ "code": "XXXX-XXXX" }`  
   → **204** + access/refresh; MFA cookie cleared.
4. Then `/me` as usual.

```ts
export type LoginOutcome =
  | { kind: 'session' }
  | { kind: 'mfaRequired' };

export async function login(
  apiBase: string,
  email: string,
  password: string
): Promise<LoginOutcome> {
  const res = await apiFetch(apiBase, '/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 204) return { kind: 'session' };
  if (res.status === 200) {
    const body = (await res.json()) as { mfaRequired?: boolean };
    if (body.mfaRequired) return { kind: 'mfaRequired' };
  }
  // 401 → generic "Invalid email or password"
  throw await toApiError(res);
}
```

Invalid credentials always look like generic **401** (`Invalid email or password`) — do not reveal whether the email exists.

---

## 4. `must_change_password`

If `/me` has `mustChangePassword: true`, or any protected call returns **403** with `errorCode: PASSWORD_CHANGE_REQUIRED`:

1. Route the user to a **forced password change** screen.
2. Allowed while gated: `/api/v1/auth/me`, `/api/v1/me/password`, logout, logout-all, refresh, csrf.
3. `POST /api/v1/me/password` (current + new) → then re-login (sessions were revoked).

Do not leave the user on normal app routes until the flag clears.

---

## 5. Session refresh — single-flight

Access TTL is short (default **5m**). On **401** from a protected API (or proactively before expiry):

1. Call `POST /api/v1/auth/refresh` (CSRF + credentials). No body; refresh cookie is enough.
2. **204** → retry the original request once.
3. Refresh **401** → clear local auth UX and send the user to login (cookies may already be invalid).

**Single-flight:** if many requests fail at once, only **one** refresh may run. Others await the same promise.

```ts
let refreshInFlight: Promise<boolean> | null = null;

export function refreshSession(apiBase: string): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await apiFetch(apiBase, '/api/v1/auth/refresh', { method: 'POST' });
      return res.status === 204;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetchWithRefresh(
  apiBase: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const first = await apiFetch(apiBase, path, init);
  if (first.status !== 401) return first;

  const ok = await refreshSession(apiBase);
  if (!ok) return first;
  return apiFetch(apiBase, path, init);
}
```

Notes:

- Never attach the access JWT manually; cookies are automatic.
- Do not call refresh in a loop on repeated 401 after a failed refresh.
- Distinguish **503** (infra / fail-closed DB) from **401** (auth failure): on 503, retry/backoff and **do not** clear the session as “logged out”.

---

## 6. Cross-tab refresh coordination

Multiple tabs share the same API cookies. Without coordination, parallel refreshes can race (one refresh rotates; another may see reuse and revoke the family).

Recommended pattern:

1. **Leader election / mutex** via `BroadcastChannel` (preferred) or `localStorage` lock + `storage` events.
2. When tab A starts refresh, broadcast `refresh:start`.
3. Other tabs **await** `refresh:done` / `refresh:failed` instead of calling refresh themselves.
4. On `refresh:failed`, all tabs navigate to login.

```ts
const channel = new BroadcastChannel('auth');

type AuthMsg =
  | { type: 'refresh:start' }
  | { type: 'refresh:done' }
  | { type: 'refresh:failed' }
  | { type: 'logout' };

let waiting: Array<(ok: boolean) => void> = [];

channel.onmessage = (ev: MessageEvent<AuthMsg>) => {
  if (ev.data.type === 'refresh:done') {
    waiting.splice(0).forEach((r) => r(true));
  } else if (ev.data.type === 'refresh:failed' || ev.data.type === 'logout') {
    waiting.splice(0).forEach((r) => r(false));
  }
};

export async function refreshSessionCoordinated(apiBase: string): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  channel.postMessage({ type: 'refresh:start' });
  refreshInFlight = (async () => {
    const ok = await refreshSession(apiBase); // uses single-flight above
    channel.postMessage({ type: ok ? 'refresh:done' : 'refresh:failed' });
    return ok;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Other tabs: wait instead of refreshing */
export function waitForPeerRefresh(timeoutMs = 10_000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    waiting.push((ok) => {
      clearTimeout(timer);
      resolve(ok);
    });
  });
}
```

Simpler alternative: only the “focused” tab refreshes; background tabs on `visibilitychange` call `/me` and refresh if needed — still combine with in-tab single-flight.

On logout in one tab, broadcast `logout` so peers clear UI state (cookies are already cleared by the API response).

---

## 7. Logout

| Call | When |
|---|---|
| `POST /api/v1/auth/logout` | Current device / family; always **204**; clears auth (+ MFA) cookies |
| `POST /api/v1/auth/logout-all` | All sessions; requires authenticated access |

After either: clear in-memory CSRF (re-bootstrap on next login page), clear user state, broadcast `logout` to other tabs, route to login.

---

## 8. Status handling cheat sheet

| HTTP | `errorCode` (typical) | Frontend action |
|---|---|---|
| 204 | — | Success for login/refresh/logout/mutations without body |
| 200 | — | Login MFA challenge, or JSON resource |
| 401 | `UNAUTHORIZED` | Try single-flight refresh once; else login |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Force password-change UX |
| 403 | `ORIGIN_REJECTED` / CSRF / `FORBIDDEN` | Fix Origin/CSRF; or show forbidden |
| 409 | `CONFLICT` | e.g. last SUPER_ADMIN; show message |
| 503 | `SERVICE_UNAVAILABLE` | Retry; **do not** treat as logout |

---

## 9. Local vs sibling-host checklist

### Local (`localhost:5173` → `localhost:8080`)

- [ ] `apiBase = http://localhost:8080`
- [ ] CORS origin listed in `app.cors.allowed-origins`
- [ ] `credentials: 'include'` on all API calls
- [ ] CSRF bootstrap before any mutation (including login)

### Prod siblings (`app.example.com` → `api.example.com`)

- [ ] HTTPS everywhere; `__Host-` cookies require Secure + Path=/
- [ ] FE never tries to read auth/CSRF cookies (HttpOnly / wrong host)
- [ ] `CORS_ALLOWED_ORIGIN=https://app.example.com`
- [ ] Same CSRF memory pattern; header name still `X-XSRF-TOKEN`

---

## 10. Minimal boot sequence

```text
app start
  → GET /auth/csrf (credentials) → memory token
  → GET /auth/me
       200 → enter app (honor mustChangePassword / roles)
       401 → single-flight refresh → retry /me
            still 401 → login page
login
  → POST /login
       204 → /me
       200 mfaRequired → verify/recover → /me
401 on API
  → coordinated single-flight refresh → retry once
503 on API
  → retry/backoff; keep session UX
logout
  → POST /logout → clear memory + broadcast
```

## Framework notes

- **Angular:** `HttpInterceptor` for CSRF header + refresh single-flight; `provideHttpClient(withCredentials())` or per-request `withCredentials: true`.
- **React:** axios/fetch wrapper module; React Query / SWR global 401 handler calling `refreshSessionCoordinated`.
- Never put access/refresh tokens in SPA storage; never log CSRF or MFA codes.
