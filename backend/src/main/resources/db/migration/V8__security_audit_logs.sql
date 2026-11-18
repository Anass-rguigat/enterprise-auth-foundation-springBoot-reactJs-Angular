-- Phase 12: append-only security audit log + retention purge function.
-- Runtime role gets INSERT/SELECT only (default DML then REVOKE UPDATE/DELETE).
-- Retention role may EXECUTE the SECURITY DEFINER purge function only.

CREATE TABLE security_audit_logs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type       varchar(64) NOT NULL,
    module           varchar(64) NOT NULL,
    actor_user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
    target_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
    outcome          varchar(32) NOT NULL,
    ip_hash          varchar(64),
    user_agent_hash  varchar(64),
    correlation_id   varchar(64),
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at       timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT security_audit_logs_outcome_chk
        CHECK (outcome IN ('SUCCESS', 'FAILURE', 'DENIED', 'INFO'))
);

CREATE INDEX idx_security_audit_logs_created_at ON security_audit_logs (created_at DESC);
CREATE INDEX idx_security_audit_logs_actor ON security_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX idx_security_audit_logs_target ON security_audit_logs (target_user_id, created_at DESC);
CREATE INDEX idx_security_audit_logs_event_type ON security_audit_logs (event_type, created_at DESC);
CREATE INDEX idx_security_audit_logs_correlation ON security_audit_logs (correlation_id)
    WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE security_audit_logs IS
    'Append-only security audit. Runtime role INSERT/SELECT only; purge via retention function.';
COMMENT ON COLUMN security_audit_logs.metadata IS
    'Non-sensitive structured context (role codes, family ids). Never passwords, tokens, or TOTP secrets.';
COMMENT ON COLUMN security_audit_logs.ip_hash IS 'SHA-256 hex of client IP; raw IP not stored.';
COMMENT ON COLUMN security_audit_logs.user_agent_hash IS 'SHA-256 hex of User-Agent; raw UA not stored.';

-- Override default DML: app must not UPDATE/DELETE audit rows (ownership stays with auth_owner).
REVOKE UPDATE, DELETE ON security_audit_logs FROM auth_app;
-- Retention already has SELECT via default privileges; no DELETE grant on the table itself.

CREATE OR REPLACE FUNCTION purge_expired_security_audit_logs(p_retention_days integer DEFAULT 365)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_days integer;
    v_deleted bigint;
BEGIN
    -- Validated bounds only — no dynamic SQL; cutoff from clock inside the function.
    IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 3650 THEN
        RAISE EXCEPTION 'purge_expired_security_audit_logs: retention days must be between 30 and 3650'
            USING ERRCODE = '22023';
    END IF;
    v_days := p_retention_days;

    DELETE FROM security_audit_logs
    WHERE created_at < (timezone('utc', now()) - make_interval(days => v_days));

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

ALTER FUNCTION purge_expired_security_audit_logs(integer) OWNER TO auth_owner;

REVOKE ALL ON FUNCTION purge_expired_security_audit_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION purge_expired_security_audit_logs(integer) FROM auth_app;
GRANT EXECUTE ON FUNCTION purge_expired_security_audit_logs(integer) TO auth_retention;

COMMENT ON FUNCTION purge_expired_security_audit_logs(integer) IS
    'SECURITY DEFINER purge for expired audit rows. Executable only by auth_retention. Fixed search_path.';
