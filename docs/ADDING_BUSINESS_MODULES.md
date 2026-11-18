# Adding business modules

This foundation is a **modular monolith**. Auth, users, RBAC, MFA, email, and audit stay in core packages. Domain features live under `business/<module>` and plug into the same permission catalog and security stack.

The **demo Notes** module (`business/demo`) is the reference implementation. Follow it when adding ERP/HR/inventory features, and remove it when you no longer need the sample.

## Checklist (definition of done for a new module)

1. Create package `com.company.application.business.<module>`.
2. Define permission code constants (e.g. `DemoPermissions`).
3. Register a Spring `@Component` implementing `PermissionCatalogContributor`.
4. Add a Flyway migration `V<n>__<module>_….sql` for module tables (owner role; dual-role grants via default privileges).
5. Add entities, repositories, services, and `@RestController` APIs under `/api/v1/…`.
6. Protect every mutating/read endpoint with `@PreAuthorize("hasAuthority('…')")` using your permission codes.
7. Scope data access by tenant/owner as required (demo uses `owner_user_id`).
8. Add unit/WebMvc tests; optionally an integration test with Testcontainers.
9. Document the module briefly in README (or a module-specific doc).
10. Assign permissions to roles via admin APIs (SUPER_ADMIN receives all catalog permissions automatically on sync).

## Permission catalog plug-in

```java
@Component
public class DemoPermissionCatalogContributor implements PermissionCatalogContributor {
    @Override
    public List<PermissionDef> permissions() {
        return List.of(
            new PermissionDef("NOTE_CREATE", "demo", "Create demo notes"),
            new PermissionDef("NOTE_READ", "demo", "Read demo notes"),
            // …
        );
    }
}
```

On startup, `PermissionSyncService`:

- UPSERTs every contributed code into `permissions`
- Grants every catalog permission to the `SUPER_ADMIN` role
- **Never deletes** orphan permission rows if you remove a contributor

Non–SUPER_ADMIN roles must be granted module permissions explicitly (`ROLE_ASSIGN_PERMISSION` / admin UI).

## Demo Notes module (reference)

| Piece | Location |
|---|---|
| Package | `com.company.application.business.demo` |
| Migration | `V9__demo_notes.sql` → table `demo_notes` |
| Permissions | `NOTE_CREATE`, `NOTE_READ`, `NOTE_UPDATE`, `NOTE_DELETE` |
| API | `/api/v1/demo/notes` (CRUD, owner-scoped) |

| Method | Path | Authority |
|---|---|---|
| GET | `/api/v1/demo/notes` | `NOTE_READ` |
| GET | `/api/v1/demo/notes/{id}` | `NOTE_READ` |
| POST | `/api/v1/demo/notes` | `NOTE_CREATE` |
| PUT | `/api/v1/demo/notes/{id}` | `NOTE_UPDATE` |
| DELETE | `/api/v1/demo/notes/{id}` | `NOTE_DELETE` |

Owner isolation: repository methods filter by `owner_user_id` = authenticated user. Another user’s note id returns **404**, not **403**.

CSRF, cookies, CORS, and JWT rules are unchanged — demo endpoints are normal authenticated APIs.

## Removing the demo module

1. Delete package `business/demo` (and its tests).
2. Remove or reverse `V9__demo_notes.sql` only on **fresh** environments; on shared DBs prefer a new migration that `DROP TABLE demo_notes` after backup.
3. Orphan `NOTE_*` rows may remain in `permissions` (by design). Optionally delete them manually and detach from `role_permissions`.
4. Restart so catalog sync no longer contributes those codes.

## What not to do

- Do not put business entities in `authentication`, `authorization`, or `user`.
- Do not embed permissions in JWTs or introduce a permission cache unless you redesign fail-closed authz.
- Do not call SMTP directly from business services — enqueue via the email outbox when sending mail.
- Do not grant table ownership to `auth_app`; keep Flyway/owner vs runtime roles as in [DATABASE.md](DATABASE.md).
