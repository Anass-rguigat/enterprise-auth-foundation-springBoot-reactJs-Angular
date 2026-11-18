# React SPA guide

Option 2 frontend: `frontend/react-app` (React 19 + Vite 8). Same API contract as Angular — [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md). Equivalence: [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md).

## Run locally

```bash
# Terminal A — API + DB + Mailpit
docker compose up --build -d

# Terminal B — React
cd frontend/react-app
cp -n .env.example .env    # VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev                # http://localhost:5173
```

Compose profile (optional):

```bash
docker compose --profile react up --build
```

**Do not** run authenticated Angular and React together. Close the other SPA’s tabs before switching.

## Deep links (email)

Compose defaults already target the React origin:

```bash
INVITATION_ACCEPT_BASE_URL=http://localhost:5173/invite/accept
PASSWORD_RESET_BASE_URL=http://localhost:5173/reset-password
EMAIL_VERIFY_BASE_URL=http://localhost:5173/verify-email
```

Routes consume `?token=` (see auth shell routes).

## Scripts

```bash
npm run dev               # Vite
npm run build
npm test                  # Vitest watch
npm run test:ci           # CI / single run (Phase 26)
npm run lint              # Oxlint
```

## Layout

| Path | Role |
|---|---|
| `src/core/` | Theme, permissions, nav, auth/CSRF/axios/`AuthContext`/guards |
| `src/shared/ui/` | Design-system kit |
| `src/layout/` | Shell, auth-shell, sidebar, topbar |
| `src/features/` | Auth + users/RBAC/security/MFA/audit/notes |
| `src/testing/` | Vitest setup + fixtures |

## Related docs

- [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) — CSRF, refresh, MFA UX rules  
- [FRONTEND_DESIGN_TOKENS.md](FRONTEND_DESIGN_TOKENS.md) — shared visual tokens  
- [FRONTEND_TESTING.md](FRONTEND_TESTING.md) — test matrix  
- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) · [DOCKER_SETUP.md](DOCKER_SETUP.md)
