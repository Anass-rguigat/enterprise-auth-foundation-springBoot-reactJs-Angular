# Enterprise Auth Foundation

Reusable modular Spring Boot monolith for authentication, authorization, user management, MFA, email, and audit — designed as a secure base for future business applications (ERP, HR, inventory, SaaS, and similar).

**Status:** Phase 28 complete — foundation delivered (backend + Angular/React SPAs, equivalence signed off, Docker/local runbooks). Meta: `GET /api/v1/meta/info` → `"phase": "28"`.

## Technology baseline

| Component | Version | Notes |
|---|---|---|
| Java | 21 LTS | Required |
| Spring Boot | **4.1.2** | Current stable 4.1.x; OSS-supported line |
| PostgreSQL | 16 | Docker Compose service `db` |
| Mailpit | latest | Local SMTP capture (`mailpit`) |
| Angular | 21.x | Option 1 SPA (`frontend/angular-app`) |
| React + Vite | 19.x / 8.x | Option 2 SPA (`frontend/react-app`) |
| Build | Maven 3.9+ / Node 22+ | |

### Why Spring Boot 4.1.2 (not 3.5.x)

Spring Boot **3.5.16** was the final open-source 3.5.x release; OSS support for 3.5 ended **30 Jun 2026**. This foundation targets **4.1.2** so cloned business applications continue to receive open-source security patches (Framework 7 / Security 7 / Jakarta EE 11 via the Boot BOM).

## Quick start (Docker Compose)

Requires a running Docker daemon.

```bash
cp .env.example .env
# Edit POSTGRES_PASSWORD / DB_* passwords in .env

docker compose up --build -d
docker compose ps
curl -s http://localhost:8080/actuator/health
curl -s http://localhost:8080/api/v1/meta/info
```

See [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) for ports, profiles, deep links, healthchecks, and reset.

| Service | Host port (default) | Purpose |
|---|---|---|
| `backend` | 8080 | Spring Boot API + Actuator |
| `db` | 5432 | PostgreSQL 16 (volume `pgdata`) |
| `mailpit` | 8025 UI / 1025 SMTP | Local email inspection |
| `angular-app` | 4200 | Option 1 (Compose profile `angular`) |
| `react-app` | 5173 | Option 2 (Compose profile `react`) |

### Useful commands

```bash
docker compose logs -f backend
docker compose restart backend
docker compose down          # stop; keep DB volume
docker compose down -v       # stop and DELETE local DB data (destructive)
```

## Frontend options (choose one)

Both SPAs talk to the same backend. **Do not** run authenticated Angular and React at the same time (shared API cookies / refresh rotation). Close the previous SPA’s tabs before switching.

| Guide | Doc |
|---|---|
| Angular | [docs/ANGULAR.md](docs/ANGULAR.md) |
| React | [docs/REACT.md](docs/REACT.md) |
| API contract | [docs/FRONTEND_API_INTEGRATION.md](docs/FRONTEND_API_INTEGRATION.md) |
| Equivalence | [docs/FRONTEND_EQUIVALENCE.md](docs/FRONTEND_EQUIVALENCE.md) |

### Option 1 — Angular + Spring Boot

```bash
docker compose up --build -d
cd frontend/angular-app && npm install && npm start   # http://localhost:4200
# or: docker compose --profile angular up --build
```

Set email deep links to `:4200` when using Angular (see [docs/ANGULAR.md](docs/ANGULAR.md)).

### Option 2 — React + Spring Boot

```bash
docker compose up --build -d
cd frontend/react-app
cp -n .env.example .env       # VITE_API_BASE_URL=http://localhost:8080
npm install && npm run dev    # http://localhost:5173
# or: docker compose --profile react up --build
```

Compose defaults target React deep-link paths (`/invite/accept`, `/reset-password`, `/verify-email`).

Design tokens: [docs/FRONTEND_DESIGN_TOKENS.md](docs/FRONTEND_DESIGN_TOKENS.md).

## Local Maven

```bash
cd backend
mvn test                 # WebMvc always; Testcontainers need Docker
mvn spring-boot:run      # requires local PostgreSQL with roles from .env
```

Full local workflow: [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Project layout

```
authentification/
├── backend/                 # Spring Boot API
├── frontend/
│   ├── angular-app/         # Option 1
│   └── react-app/           # Option 2
├── infrastructure/          # Compose notes (no Nginx)
├── docker-compose.yml
├── .env.example
├── docs/
└── README.md
```

## Demo business module

Owner-scoped Notes CRUD under `/api/v1/demo/notes` with permissions `NOTE_*`, registered via `PermissionCatalogContributor`. How to add or remove modules: [docs/ADDING_BUSINESS_MODULES.md](docs/ADDING_BUSINESS_MODULES.md).

## Security notes

- Never commit `.env`, PEM keys, or credentials.
- Production secrets must come from environment / a secret manager.
- See [docs/SECURITY.md](docs/SECURITY.md) and [docs/SECURITY_TESTS.md](docs/SECURITY_TESTS.md).

## Documentation

| Doc | Topic |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Repo and package layout |
| [docs/DATABASE.md](docs/DATABASE.md) | Dual DB roles, Flyway, default privileges |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) | Login, refresh, logout |
| [docs/JWT_LIFECYCLE.md](docs/JWT_LIFECYCLE.md) | Access/refresh claims and rotation |
| [docs/COOKIE_AND_CSRF.md](docs/COOKIE_AND_CSRF.md) | CSRF + CORS |
| [docs/USER_MANAGEMENT.md](docs/USER_MANAGEMENT.md) | Status lifecycle, profiles |
| [docs/ROLES_AND_PERMISSIONS.md](docs/ROLES_AND_PERMISSIONS.md) | RBAC overview |
| [docs/AUTHORIZATION.md](docs/AUTHORIZATION.md) | Catalog sync + SUPER_ADMIN grant |
| [docs/INVITATIONS_AND_BOOTSTRAP.md](docs/INVITATIONS_AND_BOOTSTRAP.md) | Invites + bootstrap admin |
| [docs/PASSWORD_MANAGEMENT.md](docs/PASSWORD_MANAGEMENT.md) | Change / forgot / reset |
| [docs/EMAIL.md](docs/EMAIL.md) | Email overview |
| [docs/EMAIL_OUTBOX.md](docs/EMAIL_OUTBOX.md) | AES-GCM outbox |
| [docs/MFA.md](docs/MFA.md) | Optional TOTP MFA + recovery |
| [docs/AUDIT.md](docs/AUDIT.md) | Security audit + retention |
| [docs/AUDIT_AND_MONITORING.md](docs/AUDIT_AND_MONITORING.md) | Audit + health overview |
| [docs/ADMIN_AND_SECURITY_DASHBOARD.md](docs/ADMIN_AND_SECURITY_DASHBOARD.md) | Admin APIs + session dashboard |
| [docs/ANGULAR.md](docs/ANGULAR.md) | Angular SPA runbook |
| [docs/REACT.md](docs/REACT.md) | React SPA runbook |
| [docs/FRONTEND_INTEGRATION.md](docs/FRONTEND_INTEGRATION.md) | SPA CSRF, refresh, MFA UX |
| [docs/FRONTEND_API_INTEGRATION.md](docs/FRONTEND_API_INTEGRATION.md) | Frozen FE API matrix (Phase 17) |
| [docs/FRONTEND_EQUIVALENCE.md](docs/FRONTEND_EQUIVALENCE.md) | Angular↔React sign-off (Phase 27) |
| [docs/FRONTEND_TESTING.md](docs/FRONTEND_TESTING.md) | SPA test matrices (Phases 22/26) |
| [docs/FRONTEND_DESIGN_TOKENS.md](docs/FRONTEND_DESIGN_TOKENS.md) | Shared Angular/React visual tokens |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Endpoint map |
| [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) | Compose + profiles + deep links |
| [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) | Dev workflow + switchover |
| [docs/SECURITY.md](docs/SECURITY.md) | Security posture + residual risks |
| [docs/SECURITY_TESTS.md](docs/SECURITY_TESTS.md) | Phase 14 security matrix |
| [docs/TESTING.md](docs/TESTING.md) | Backend + frontend how to test |
| [docs/ADDING_BUSINESS_MODULES.md](docs/ADDING_BUSINESS_MODULES.md) | Extend / remove demo module |
