# Angular ↔ React functional equivalence (Phase 27)

Sign-off against the Phase 17 seed in [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md) §9.
Run **one authenticated SPA at a time** (shared cookies / refresh rotation). Guides: [ANGULAR.md](ANGULAR.md) · [REACT.md](REACT.md) · [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

## Verdict

**Equivalent for product behavior.** Routes, auth, feature modules, API clients, advisory permission gates, nav, and design tokens match. Residual differences are framework-only (DI vs Context, HttpClient vs axios) or shared backend gaps that both SPAs omit equally.

Automated mirrors: Angular Phase 22 (`npm run test:ci`) · React Phase 26 (`npm run test:ci`).

## Checklist (seed §9)

| # | Feature | Angular | React | Status |
|---|---|---|---|---|
| 1 | CSRF bootstrap + memory token | ✓ | ✓ | Match |
| 2 | Login without MFA | ✓ | ✓ | Match |
| 3 | Login MFA verify/recover | ✓ | ✓ | Match |
| 4 | `/auth/me` init (roles/permissions) | ✓ | ✓ | Match |
| 5 | Single-flight refresh on 401 | ✓ | ✓ | Match |
| 6 | Same-origin cross-tab refresh | ✓ | ✓ | Match |
| 7 | 503 ≠ logout | ✓ | ✓ | Match |
| 8–9 | Logout / logout-all | ✓ | ✓ | Match |
| 10–13 | Forgot / reset / change / must-change password | ✓ | ✓ | Match |
| 14–15 | Email change + verify | ✓ | ✓ | Match |
| 16–19 | MFA enroll / confirm / disable / recovery | ✓ | ✓ | Match |
| 20 | Self profile (not `PROFILE_UPDATE`) | ✓ | ✓ | Match |
| 21–26 | User admin + invite accept | ✓ | ✓ | Match |
| 27 | Permission catalog (`PERMISSION_READ`) | ✓ | ✓ | Match |
| 28–30 | Role CRUD + permission attach/detach | ✓ | ✓ | Match |
| 31–32 | Assign/remove roles + grant SUPER_ADMIN | ✓ | ✓ | Match |
| 33 | Permission-based nav (advisory) | ✓ | ✓ | Match |
| 34–35 | Security overview + sessions | ✓ | ✓ | Match |
| 36 | Audit logs | ✓ | ✓ | Match |
| 37 | Dashboard shell | ✓ | ✓ | Match |
| 38 | Demo notes (`NOTE_*`) | ✓ | ✓ | Match |
| 39 | No JWT in web storage | ✓ | ✓ | Match |
| 40 | SPA switchover discipline | ✓ | ✓ | Match |

## Route map

Auth shell: `/login`, `/mfa`, `/forgot-password`, `/reset-password`, `/change-password`, `/verify-email`, `/invite/accept`.  
App shell (authenticated): `/dashboard`, `/profile`, `/settings/email`, `/settings/mfa`, `/security`, `/users`, `/users/new`, `/users/:userId`, `/roles`, `/roles/:roleCode`, `/permissions`, `/audit`, `/audit/:id` (notes/status remain unlinked demo routes).

## Intentional differences

| Topic | Notes |
|---|---|
| Framework | Angular DI + `HttpClient` interceptors vs React Context + axios + `authBridge` |
| Ports | `:4200` vs `:5173`; `BroadcastChannel` does not cross hosts |
| Boot UX | Angular `provideAppInitializer` vs React `AuthBootGate` |
| Login typing | React `LoginOutcome` includes `mustChangePassword`; UX identical |
| Hello meta | React uses raw `fetch` for public `GET /meta/info` |
| React Query | Provider present; Phase 25 features use imperative API clients (parity with Angular) |

## Parity fix applied in Phase 27

Peer-tab `logout` broadcast now calls `handleSessionLost()` on **both** SPAs (clear session, re-bootstrap CSRF, navigate `/login`). Angular previously only cleared signals, which left the shell mounted with permissive unloaded nav.

## Shared backend residuals (not SPA gaps)

From [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md) §8: no invitation list/cancel UI, no admin list of another user’s sessions, no invent-permission HTTP, local theme only. Both SPAs honor these omissions.

## Acceptance

- [x] Seed checklist 1–40 marked Match for both SPAs
- [x] Peer-logout shell linger closed on Angular
- [x] Automated auth/security suites remain green on both fronts
- [x] No invented APIs beyond the frozen matrix
