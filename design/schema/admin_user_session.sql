-- source: v1 admin_user_sessions (UUID→BIGSERIAL)
--   - restored: device_name, device_id, user_agent, is_active, last_used_at, revoked_reason (v2 removed — security regression)
-- check:skip-audit (append-heavy session store; revoked_at serves soft-delete; no updated_by/deleted_at)
CREATE TABLE admin_user_session (
    id                  BIGSERIAL    PRIMARY KEY,
    admin_user_id       BIGINT       NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(255) NOT NULL,
    access_token_jti    VARCHAR(255),
    device_name         VARCHAR(255),
    device_id           VARCHAR(255),
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    expires_at          TIMESTAMPTZ  NOT NULL,
    last_used_at        TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    revoked_reason      VARCHAR(255),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_user_session_user    ON admin_user_session (admin_user_id);
CREATE INDEX idx_admin_user_session_token   ON admin_user_session (refresh_token_hash);
CREATE INDEX idx_admin_user_session_expires ON admin_user_session (expires_at);
CREATE INDEX idx_admin_user_session_active
    ON admin_user_session (admin_user_id)
    WHERE is_active = TRUE AND revoked_at IS NULL;
