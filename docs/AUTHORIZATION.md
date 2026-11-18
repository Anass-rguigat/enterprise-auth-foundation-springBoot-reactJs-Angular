# Authorization / RBAC (Phases 9 + 16)

## Model

Effective permissions = **union** of permissions of all roles assigned to the user.

Loaded from PostgreSQL on **every authenticated request** (`PermissionQueryService` in `JwtAuthenticationFilter`). No permission cache. Permissions are **not** embedded in JWTs.

### `authz_version` vs `token_version`

| Field | Role |
|---|---|
| `users.token_version` (`tv` in access JWT) | Checked every request; mismatch → **401**. Bumped on logout-all / password reset / session kill. |
| `users.authz_version` | Observability / optional FE hint (returned from `/auth/me`). **Not** in JWT; **not** checked by the filter. Bumped on role assign/remove and role↔permission changes. Does **not** invalidate sessions. |

New permissions apply on the **next** authenticated request without re-login.

## Catalog sync

Code catalog (`Permissions` + `PermissionCatalogContributor` beans) → startup UPSERT into `permissions`.

- Updates module/description for existing codes.
- **Never auto-deletes** DB permission rows.
- Ensures `SUPER_ADMIN` role holds every catalog permission.
- `PERMISSION_MANAGE` exists in the catalog but has **no** invent-permission HTTP API.

Business modules add a `PermissionCatalogContributor` bean (see [ADDING_BUSINESS_MODULES.md](ADDING_BUSINESS_MODULES.md)).

## Privilege delegation (Phase 16)

Service-layer rules (not UI / not `@PreAuthorize` alone):

- Non–SUPER_ADMIN may **assign** a role only if that role’s permissions are a **subset** of the actor’s (`AdminSafeguardService.assertCanAssignRole`).
- Non–SUPER_ADMIN may **attach/detach** permission `P` on a custom role only if they **hold `P`**.
- System roles (`system_role=true`, including `SUPER_ADMIN`) have **immutable** permission sets over HTTP.
- User←role assign path lock order (one transaction, default **READ COMMITTED**):  
  **`FOR UPDATE` on role → `assertCanAssignRole` → insert → commit** (lock held until commit).

## Concurrency / role delete

- Flyway **V10**: `user_roles.role_id` is **`ON DELETE RESTRICT`** (final DB safety net; was CASCADE before Phase 16).
- Delete role: `FOR UPDATE` → reject system roles → re-check assignment count → delete; unexpected FK → **409 CONFLICT** (rollback, then Problem Details).
- Role↔permission mutations also take `FOR UPDATE` on the role row.

## SUPER_ADMIN grant policy

| Operation | Rule |
|---|---|
| `POST /admin/users/{id}/roles` (`USER_ASSIGN_ROLE`) | **Rejects** `roleCode=SUPER_ADMIN` |
| `POST /admin/users/{id}/grant-super-admin` | Actor must already be SUPER_ADMIN **role**; password step-up required; `SECURITY_MANAGE` alone cannot bypass |
| Remove last SUPER_ADMIN | Rejected (`409 CONFLICT`) |

## Key endpoints

| Method | Path | Authority |
|---|---|---|
| GET | `/api/v1/admin/roles` | `ROLE_READ` |
| GET | `/api/v1/admin/roles/{roleCode}` | `ROLE_READ` |
| POST | `/api/v1/admin/roles` | `ROLE_CREATE` |
| PATCH | `/api/v1/admin/roles/{roleCode}` | `ROLE_UPDATE` |
| DELETE | `/api/v1/admin/roles/{roleCode}` | `ROLE_DELETE` |
| POST | `/api/v1/admin/roles/{roleCode}/permissions` | `ROLE_ASSIGN_PERMISSION` + delegation |
| DELETE | `/api/v1/admin/roles/{roleCode}/permissions/{permissionCode}` | `ROLE_ASSIGN_PERMISSION` + delegation |
| POST | `/api/v1/admin/users/{id}/roles` | `USER_ASSIGN_ROLE` (+ subset unless SUPER_ADMIN) |
| DELETE | `/api/v1/admin/users/{id}/roles/{roleCode}` | `USER_ASSIGN_ROLE` or SUPER_ADMIN |
| POST | `/api/v1/admin/users/{id}/grant-super-admin` | SUPER_ADMIN role + step-up |
| GET | `/api/v1/admin/permissions` | `PERMISSION_READ` |

`GET /api/v1/auth/me` returns `roles`, `permissions`, and `authzVersion`.
