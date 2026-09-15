-- +goose Up
-- +goose StatementBegin
-- source: design/schema/system_file.sql
CREATE TABLE system_file (
    id            BIGSERIAL    PRIMARY KEY,
    bucket        TEXT         NOT NULL,
    object_key    TEXT         NOT NULL,
    content_type  TEXT         NOT NULL,
    size_bytes    BIGINT       NOT NULL,
    purpose       TEXT         NOT NULL,
    original_name TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMPTZ,
    created_by    BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by    BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_system_file_object_key UNIQUE (object_key)
);

CREATE INDEX idx_system_file_purpose     ON system_file (purpose, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_file_created_by  ON system_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_file_updated_by  ON system_file (updated_by) WHERE updated_by IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS system_file CASCADE;
-- +goose StatementEnd
