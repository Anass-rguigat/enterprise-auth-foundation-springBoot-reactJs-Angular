# Testing

## Backend

```bash
cd backend
mvn test
```

- Unit + WebMvc tests always run.
- Testcontainers integration tests **skip** when Docker is unavailable.

### Layers

| Layer | Examples |
|---|---|
| Unit | `*ServiceTest`, JWT/TOTP/outbox crypto |
| WebMvc | Controller DTO/mass-assignment/validation (`@WebMvcTest`) |
| Integration | Auth, CSRF/CORS, MFA, RBAC, audit grants, Flyway roles |

Security matrix detail: [SECURITY_TESTS.md](SECURITY_TESTS.md).

### Demo module

| Test | Focus |
|---|---|
| `DemoPermissionCatalogContributorTest` | Catalog codes |
| `DemoNoteServiceTest` | Owner scoping / validation |
| `DemoNoteControllerWebMvcTest` | CRUD HTTP contract |

### Conventions

- Prefer AssertJ.
- Do not assert on timing-sensitive crypto beyond correctness.
- Integration tests that need the DB use the shared Testcontainers setup already used by auth ITs.

## Frontend

| SPA | Command | Doc |
|---|---|---|
| Angular | `cd frontend/angular-app && npm run test:ci` | [FRONTEND_TESTING.md](FRONTEND_TESTING.md) · [ANGULAR.md](ANGULAR.md) |
| React | `cd frontend/react-app && npm run test:ci` | [FRONTEND_TESTING.md](FRONTEND_TESTING.md) · [REACT.md](REACT.md) |

Security-critical FE coverage (both): CSRF memory, refresh single-flight, 401/403/503 handling, guards, login/MFA forms. Equivalence: [FRONTEND_EQUIVALENCE.md](FRONTEND_EQUIVALENCE.md).

## Phase marker

```bash
curl -s http://localhost:8080/api/v1/meta/info
```

`phase` reflects the completed foundation milestone (Phase 28 = docs/runbooks complete).
