# Local development

## Prerequisites

- Java 21
- Maven 3.9+
- Node.js 22+ (frontend SPAs)
- Docker (for Compose and Testcontainers integration tests)

## Compose (recommended)

```bash
cp .env.example .env
# set POSTGRES_* and DB_* passwords

docker compose up --build -d
curl -s http://localhost:8080/actuator/health
curl -s http://localhost:8080/api/v1/meta/info
```

Mailpit UI: http://localhost:8025

Bootstrap first admin (optional): set `BOOTSTRAP_ENABLED=true` and bootstrap email/password in `.env`, start once, then disable. See [DOCKER_SETUP.md](DOCKER_SETUP.md).

## Maven against Compose DB

Point Spring datasource at host-mapped Postgres (`localhost:5432`) with `DB_APP_*` credentials from `.env`, or run the app inside Compose (`backend` service).

```bash
cd backend
mvn test
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Integration tests that need Docker **skip** when the daemon is unavailable. Backend matrix: [TESTING.md](TESTING.md), [SECURITY_TESTS.md](SECURITY_TESTS.md).

## Frontend against local API

Use **one** SPA at a time for authenticated work. Credentialed requests, CSRF memory token, and refresh rules: [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md), [FRONTEND_API_INTEGRATION.md](FRONTEND_API_INTEGRATION.md). CORS allowlists both origins.

### Option 1 — Angular (`:4200`)

Full guide: [ANGULAR.md](ANGULAR.md).

```bash
cd frontend/angular-app && npm install && npm start
```

API base: `src/environments/environment*.ts` → `http://localhost:8080`.  
Deep links: set `INVITATION_ACCEPT_BASE_URL` / reset / verify to `http://localhost:4200/...`.

### Option 2 — React (`:5173`)

Full guide: [REACT.md](REACT.md).

```bash
cd frontend/react-app && cp -n .env.example .env && npm install && npm run dev
```

API base: `VITE_API_BASE_URL` in `.env`.  
Compose defaults already target React deep-link paths.

### Compose SPA profiles

```bash
docker compose --profile angular up --build
docker compose --profile react up --build
```

### Switchover checklist

1. Sign out (or close all tabs) of the SPA you are leaving.
2. Stop the other Compose profile if it was running.
3. Confirm deep-link env vars match the SPA you will use.
4. Open only that SPA origin and sign in.

## Frontend tests

```bash
cd frontend/angular-app && npm run test:ci   # Phase 22
cd frontend/react-app && npm run test:ci     # Phase 26
```

See [FRONTEND_TESTING.md](FRONTEND_TESTING.md). Equivalence sign-off: [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md).

## Secrets

Never commit `.env`, PEMs, or KEKs. Generate local keys:

```bash
openssl rand -base64 32   # outbox / MFA KEK
# ES256 keypair per your JWT config / .env.example comments
```
