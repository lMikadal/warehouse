-- source: v1 admin_users + v2 v2_admin_users (UUID→BIGSERIAL)
--   - restored: failed_login_attempts, locked_until (lockout; v2 removed these — security regression)
--   - removed:  password_credit_hash / password_discount_hash (those are approval flows, not passwords)
--   - removed:  is_superadmin → type enum (org hierarchy; admin_role_id still handles fine-grained permissions)
--   - v2 status BOOLEAN is_active → v1-style enum (supports suspended/locked states)
CREATE TYPE admin_user_status AS ENUM ('active', 'inactive', 'suspended', 'locked');
CREATE TYPE admin_user_type   AS ENUM ('superadmin', 'owner', 'manager', 'staff');

CREATE TABLE admin_user (
    id                     BIGSERIAL         PRIMARY KEY,
    username               VARCHAR(100)      NOT NULL,
    email                  VARCHAR(255),
    password_hash          VARCHAR(255)      NOT NULL,
    status                 admin_user_status NOT NULL DEFAULT 'active',
    type                   admin_user_type   NOT NULL DEFAULT 'staff',
    admin_role_id          BIGINT            REFERENCES admin_role(id) ON DELETE SET NULL,
    last_login_at          TIMESTAMPTZ,
    failed_login_attempts  INTEGER           NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by             BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by             BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_admin_user_username
    ON admin_user (LOWER(username))
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_admin_user_email
    ON admin_user (LOWER(email))
    WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_admin_user_role       ON admin_user (admin_role_id) WHERE admin_role_id IS NOT NULL;
CREATE INDEX idx_admin_user_status     ON admin_user (status)        WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_user_type       ON admin_user (type)          WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_user_created_by ON admin_user (created_by)    WHERE created_by IS NOT NULL;
CREATE INDEX idx_admin_user_updated_by ON admin_user (updated_by)    WHERE updated_by IS NOT NULL;
