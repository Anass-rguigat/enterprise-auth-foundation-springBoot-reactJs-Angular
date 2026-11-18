-- Phase 16: prevent silent CASCADE wipe of user_roles when a role is deleted.
-- Application locks + count checks are primary; FK RESTRICT is the final safety net.

ALTER TABLE user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;

ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_role_id_fkey
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT user_roles_role_id_fkey ON user_roles IS
    'ON DELETE RESTRICT: refuse role deletion while any user_roles row references the role.';
