# Audit and monitoring

Security audit implementation: [AUDIT.md](AUDIT.md).

## Summary

- Append-only `security_audit_logs` (app role: INSERT + SELECT; no UPDATE/DELETE).
- Retention purge via SECURITY DEFINER function executed by dedicated retention role.
- Query API requires `AUDIT_READ`.
- Events cover auth success/failure, admin mutations, MFA, and high-risk security actions.
- Correlation id from request MDC is stored when present.
- IP / UA stored hashed where applicable.

## Health

- `GET /actuator/health` — liveness/readiness style checks for Compose.
- `GET /api/v1/meta/info` — public build/phase marker (not a security boundary).

Operational logging uses structured SLF4J; do not log secrets, raw tokens, or TOTP secrets.
