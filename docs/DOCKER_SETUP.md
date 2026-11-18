# Docker Setup

Local development stack: Spring Boot backend, PostgreSQL 16, Mailpit, and optional SPA profiles.

## Prerequisites

- Docker Engine + Docker Compose v2+
- Copy environment file:

```bash
cp .env.example .env
```

Set local passwords for `POSTGRES_PASSWORD`, `DB_OWNER_PASSWORD`, `DB_APP_PASSWORD`, and `DB_RETENTION_PASSWORD`. Do not commit `.env`.

On first start, `docker/postgres/init/00-create-roles.sh` creates `auth_owner` (Flyway), `auth_app` (runtime), and `auth_retention`. See [DATABASE.md](DATABASE.md).

## Start / stop

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
docker compose down          # keep volume
docker compose down -v       # destructive: delete PostgreSQL data
```

## Frontend Compose profiles

No Nginx. Dev servers only. Use **one** profile for authenticated testing:

```bash
docker compose --profile angular up --build   # :4200
docker compose --profile react up --build     # :5173
```

Switchover: stop the other profile / close its browser tabs before signing in. Shared HttpOnly cookies and refresh rotation are not safe across two authenticated SPAs. Details: [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md) §7, [ANGULAR.md](ANGULAR.md), [REACT.md](REACT.md).

### Email deep links

Compose passes invitation / reset / verify base URLs to the backend. Defaults assume **React** (`:5173`). When using Angular, set in `.env`:

```bash
INVITATION_ACCEPT_BASE_URL=http://localhost:4200/invite/accept
PASSWORD_RESET_BASE_URL=http://localhost:4200/reset-password
EMAIL_VERIFY_BASE_URL=http://localhost:4200/verify-email
```

Paths must match SPA routes (`/invite/accept`, `/reset-password`, `/verify-email`) with `?token=` appended by the API.

## Endpoints

| URL | Purpose |
|---|---|
| http://localhost:8080/actuator/health | Backend health |
| http://localhost:8080/api/v1/meta/info | Phase marker |
| http://localhost:8025 | Mailpit UI |
| localhost:5432 | PostgreSQL (`DB_HOST=db` inside Compose) |
| http://localhost:4200 | Angular (profile `angular`) |
| http://localhost:5173 | React (profile `react`) |

## Healthchecks

- **db:** `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB` (`$$` so Compose does not interpolate on the host)
- **mailpit:** `/mailpit readyz`
- **backend:** `curl` to `/actuator/health` (image installs `curl`)

Backend `depends_on` waits for healthy `db` and `mailpit`. Frontend profile services wait for healthy `backend`.

## Bootstrap admin

Optional first SUPER_ADMIN:

```bash
# in .env
BOOTSTRAP_ENABLED=true
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=ChangeMeOnFirstLogin1!
```

Start once, sign in, then set `BOOTSTRAP_ENABLED=false` and recreate/restart backend. See [INVITATIONS_AND_BOOTSTRAP.md](INVITATIONS_AND_BOOTSTRAP.md).

## Secrets

No passwords, JWT keys, or SMTP credentials are hardcoded in Dockerfiles or Compose. Use `.env` / environment variables only.
