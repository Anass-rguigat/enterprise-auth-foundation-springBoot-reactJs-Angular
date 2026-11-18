# Security

## Threat posture (as-built)

| Area | Control |
|---|---|
| Transport | TLS in production; Secure cookies |
| AuthN | Argon2id passwords; ES256 JWT cookies; refresh families + reuse detection |
| AuthZ | DB-backed permissions every request; method security; last SUPER_ADMIN guards |
| CSRF | Double-submit cookie + header; Origin allowlist |
| MFA | Optional TOTP; atomic `last_totp_step`; hashed recovery codes |
| Email | AES-GCM outbox with AAD binding recipient |
| Audit | Append-only; retention via SECURITY DEFINER; hashed IP/UA |
| Secrets | Env / secret manager only; dual DB roles (owner ≠ app) |
| Fail-closed | 401 vs 503 matrix on JWT filter |

## Residual risks / ops

- CSRF relies on correct SPA integration (token in memory, not localStorage for access JWT — access is HttpOnly).
- Permission changes apply on next request; stolen access JWT remains valid until expiry/denylist/`tv` bump — keep access TTL short.
- Removing catalog permissions from code leaves orphan DB rows (intentional).
- Bootstrap admin must be disabled after first use.
- Dependency and secret scanning should run in CI (document scripts/policy in your org pipeline). OWASP ZAP baseline against a staging compose stack is recommended before production.

## Hardening checklist (Phase 14+)

Covered by automated tests in [SECURITY_TESTS.md](SECURITY_TESTS.md) / [TESTING.md](TESTING.md): refresh reuse, logout matrix, TOTP replay/concurrency, CSRF/Origin, SUPER_ADMIN grant, audit grants, outbox AAD tamper, mass-assignment-safe DTOs.

## Reporting

Treat production incidents via your org’s security process. Do not commit exploit PoCs or live credentials into this repository.
