-- source: v1 admin_user_sessions (UUID→BIGSERIAL)
--   - restored: device_name, device_id, user_agent, is_active, last_used_at, revoked_reason (v2 removed — security regression)
-- check:skip-audit (append-heavy session store; revoked_at serves soft-delete; no updated_by/deleted_at)
CREATE TABLE admin_user_session (
    id                  BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    admin_user_id       BIGINT       NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE, -- session owner
    refresh_token_hash  VARCHAR(255) NOT NULL,                 -- hashed refresh token
    access_token_jti    VARCHAR(255),                          -- JWT ID for access token revocation
    device_name         VARCHAR(255),                            -- human-readable device label
    device_id           VARCHAR(255),                            -- stable device identifier
    ip_address          VARCHAR(45),                             -- client IP at issue
    user_agent          TEXT,                                    -- browser/client user agent
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,      -- false when revoked or expired
    expires_at          TIMESTAMPTZ  NOT NULL,                   -- refresh token expiry
    last_used_at        TIMESTAMPTZ,                             -- last token refresh
    revoked_at          TIMESTAMPTZ,                             -- when session was invalidated
    revoked_reason      VARCHAR(255),                            -- logout, password_change, admin_revoke, …
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_user_session_user    ON admin_user_session (admin_user_id);
CREATE INDEX idx_admin_user_session_token   ON admin_user_session (refresh_token_hash);
CREATE INDEX idx_admin_user_session_expires ON admin_user_session (expires_at);
CREATE INDEX idx_admin_user_session_active
    ON admin_user_session (admin_user_id)
    WHERE is_active = TRUE AND revoked_at IS NULL;
