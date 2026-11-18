-- Human-readable client context for IT-facing audit views.
-- Hashes remain for integrity/privacy cross-checks; MAC is never available over HTTP.

ALTER TABLE security_audit_logs
    ADD COLUMN client_ip varchar(64),
    ADD COLUMN user_agent varchar(512),
    ADD COLUMN country varchar(64),
    ADD COLUMN city varchar(64);

COMMENT ON COLUMN security_audit_logs.client_ip IS 'Client IP observed at event time (admin audit).';
COMMENT ON COLUMN security_audit_logs.user_agent IS 'Truncated User-Agent string for device summary.';
COMMENT ON COLUMN security_audit_logs.country IS 'Best-effort location country (Local network / Unknown without GeoIP).';
COMMENT ON COLUMN security_audit_logs.city IS 'Best-effort location city.';
