# Roles and permissions

Canonical implementation detail: [AUTHORIZATION.md](AUTHORIZATION.md).

## Summary

- Roles and permissions are tables; users hold roles; roles hold permissions.
- Effective authorities = union of permission codes (+ `ROLE_<code>`).
- Loaded from PostgreSQL on **every** authenticated request — **no cache**, not in JWT.
- Code catalog (`PermissionCatalogContributor` beans) UPSERTs into `permissions` at startup.
- `SUPER_ADMIN` receives every catalog permission automatically; granting the SUPER_ADMIN **role** is a dedicated step-up path (not `USER_ASSIGN_ROLE`).

## Core vs business permissions

| Source | Examples |
|---|---|
| `CorePermissionCatalogContributor` | `USER_*`, `PROFILE_*`, `ROLE_*`, `MFA_*`, `AUDIT_READ`, … |
| `DemoPermissionCatalogContributor` | `NOTE_CREATE`, `NOTE_READ`, `NOTE_UPDATE`, `NOTE_DELETE` |

Add business permissions by implementing another contributor — see [ADDING_BUSINESS_MODULES.md](ADDING_BUSINESS_MODULES.md).

## Role catalog HTTP (Phase 16)

Custom roles: create/update/delete and attach/detach permissions via `/api/v1/admin/roles/**` (`ROLE_*` authorities).

Delegation: non–SUPER_ADMIN actors may only grant permissions they already hold; may only assign roles whose permission sets are subsets of theirs. System roles cannot have permissions changed or be deleted.

`user_roles.role_id` uses **`ON DELETE RESTRICT`**. Assign path: lock role → subset check → insert (one transaction).

## Enforcement

```java
@PreAuthorize("hasAuthority('NOTE_READ')")
```

Admin APIs under `/api/v1/admin/**` combine granular permissions with last-admin, delegation, and mass-assignment safeguards ([ADMIN_AND_SECURITY_DASHBOARD.md](ADMIN_AND_SECURITY_DASHBOARD.md), [AUTHORIZATION.md](AUTHORIZATION.md)).
