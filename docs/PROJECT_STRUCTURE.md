# Project structure

```
authentification/
├── backend/                          # Single Maven Spring Boot module
│   └── src/main/java/...             # packages as before
├── frontend/
│   ├── angular-app/                  # Option 1 — Angular 21 SPA
│   │   └── src/app/
│   │       ├── core/                 # theme, permissions, nav, auth (Phase 20)
│   │       ├── shared/ui/            # design-system kit (Phase 19)
│   │       ├── layout/               # shell, auth-shell, sidebar, topbar
│   │       └── features/             # auth + users/RBAC/security/audit/notes (Phase 21)
│   └── react-app/                    # Option 2 — React + Vite SPA
│       └── src/
│           ├── core/                 # theme, permissions, nav, auth (Phase 24)
│           ├── shared/ui/            # design-system kit (Phase 23)
│           ├── layout/               # shell, auth-shell, sidebar, topbar
│           ├── features/             # auth + users/RBAC/security/audit/notes (Phase 25)
│           └── testing/              # Vitest fixtures + setup (Phase 26)
├── infrastructure/                   # Compose notes (no Nginx)
├── docker/
│   └── postgres/                     # Role bootstrap SQL for Compose
├── docker-compose.yml                # db, mailpit, backend + FE profiles
├── .env.example
├── docs/
│   ├── ANGULAR.md / REACT.md         # SPA runbooks (Phase 28)
│   ├── FRONTEND_*.md                 # Integration, tokens, tests, equivalence
│   ├── DOCKER_SETUP.md / LOCAL_DEVELOPMENT.md
│   └── …
└── README.md
```

## Flyway migrations

| Version | Purpose |
|---|---|
| V1 | Baseline extensions / schema prep |
| V2 | Users + profiles |
| V3 | Token families + JTI denylist |
| V4 | Roles + invitations |
| V5 | Password reset tokens + email outbox |
| V6 | Permissions + role_permissions |
| V7 | MFA |
| V8 | Security audit logs + retention |
| V9 | Demo notes (`business.demo`) |
| V10 | `user_roles.role_id` ON DELETE RESTRICT (Phase 16) |

## Config profiles

- `local` — Compose / developer defaults
- `test` — unit/WebMvc; Testcontainers when Docker is present
- `prod` — stricter CORS and secret requirements

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) and [DOCKER_SETUP.md](DOCKER_SETUP.md).
