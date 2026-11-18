# Infrastructure

Optional Compose overlays and helper scripts. **No Nginx / reverse proxy** in v1.

Frontend Compose profiles live in the root `docker-compose.yml`:

- `--profile angular` — Angular dev server on `:4200`
- `--profile react` — React Vite dev server on `:5173`

Use **one** frontend profile at a time for authenticated testing (shared API cookies).

Runbooks: [DOCKER_SETUP.md](../docs/DOCKER_SETUP.md), [LOCAL_DEVELOPMENT.md](../docs/LOCAL_DEVELOPMENT.md), [ANGULAR.md](../docs/ANGULAR.md), [REACT.md](../docs/REACT.md).
