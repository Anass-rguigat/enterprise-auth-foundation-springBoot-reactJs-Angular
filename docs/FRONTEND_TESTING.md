# Frontend testing

SPA guides: [ANGULAR.md](ANGULAR.md) · [REACT.md](REACT.md). Equivalence: [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md).

## Angular (Phase 22)

CI-runnable suite:

```bash
cd frontend/angular-app
npm ci
npm run test:ci
```

Coverage focus (security-critical paths):

| Area | Specs |
|---|---|
| CSRF memory bootstrap | `csrf.service.spec.ts` |
| Login / MFA / logout / `/me` | `auth.service.spec.ts` |
| Single-flight refresh + 503 ≠ logout | `auth.service.spec.ts`, `api.interceptor.spec.ts` |
| Cross-tab BroadcastChannel | `auth-broadcast.service.spec.ts`, `auth.service.spec.ts` |
| 401 retry / 403 password gate | `api.interceptor.spec.ts` |
| Route guards | `auth.guards.spec.ts` |
| Advisory RBAC gates | `permission.service.spec.ts` |
| Login / MFA forms | `login.page.spec.ts`, `mfa-challenge.page.spec.ts` |

## React (Phase 26)

CI-runnable suite:

```bash
cd frontend/react-app
npm ci
npm run test:ci
```

Coverage focus (mirrors Angular Phase 22):

| Area | Specs |
|---|---|
| CSRF memory bootstrap | `csrf.test.ts` |
| Login / MFA / logout / `/me` | `AuthContext.test.tsx` |
| Single-flight refresh + 503 ≠ logout | `AuthContext.test.tsx`, `apiClient.test.ts` |
| Cross-tab BroadcastChannel | `authBroadcast.test.ts`, `AuthContext.test.tsx` |
| 401 retry / 403 password gate | `apiClient.test.ts` |
| Route guards | `RouteGuards.test.tsx` |
| Advisory RBAC gates | `PermissionContext.test.tsx` |
| Login / MFA forms | `LoginPage.test.tsx`, `MfaChallengePage.test.tsx` |

Full Angular↔React equivalence sign-off: [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md) (Phase 27).
