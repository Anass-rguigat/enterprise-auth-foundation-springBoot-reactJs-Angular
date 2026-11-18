# Angular SPA guide

Option 1 frontend: `frontend/angular-app` (Angular 21). Same API contract as React — [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md). Equivalence: [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md).

## Run locally

```bash
# Terminal A — API + DB + Mailpit
docker compose up --build -d

# Terminal B — Angular
cd frontend/angular-app
npm install
npm start                  # http://localhost:4200
```

API base URL: `src/environments/environment*.ts` → `http://localhost:8080`.

Compose profile (optional):

```bash
docker compose --profile angular up --build
```

**Do not** run authenticated Angular and React together. Close the other SPA’s tabs before switching.

## Deep links (email)

Point backend env at the Angular origin:

```bash
INVITATION_ACCEPT_BASE_URL=http://localhost:4200/invite/accept
PASSWORD_RESET_BASE_URL=http://localhost:4200/reset-password
EMAIL_VERIFY_BASE_URL=http://localhost:4200/verify-email
```

Routes consume `?token=` (see auth shell routes).

## Scripts

```bash
npm start                 # ng serve
npm run build
npm test                  # Vitest watch
npm run test:ci           # CI / single run (Phase 22)
```

## Layout

| Path | Role |
|---|---|
| `src/app/core/` | Theme, permissions, nav, auth/CSRF/interceptors/guards |
| `src/app/shared/ui/` | Design-system kit |
| `src/app/layout/` | Shell, auth-shell, sidebar, topbar |
| `src/app/features/` | Auth + users/RBAC/security/MFA/audit/notes |

## Related docs

- [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) — CSRF, refresh, MFA UX rules  
- [FRONTEND_DESIGN_TOKENS.md](FRONTEND_DESIGN_TOKENS.md) — shared visual tokens  
- [FRONTEND_TESTING.md](FRONTEND_TESTING.md) — test matrix  
- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) · [DOCKER_SETUP.md](DOCKER_SETUP.md)
