-- +goose Up
-- +goose StatementBegin
-- source: design/schema/system_code_prefix.sql
CREATE TYPE system_code_reset_period AS ENUM ('none', 'year', 'month');

CREATE TYPE system_code_format_style AS ENUM (
    'prefix_yyyymm_dash_seq'
);

CREATE TABLE system_code_prefix (
    id              BIGSERIAL PRIMARY KEY,
    code_key        VARCHAR(64)  NOT NULL,
    prefix          VARCHAR(20)  NOT NULL,
    reset_period    system_code_reset_period NOT NULL DEFAULT 'month',
    format_style    system_code_format_style NOT NULL,
    seq_width       SMALLINT     NOT NULL DEFAULT 5 CHECK (seq_width BETWEEN 1 AND 10),
    timezone        TEXT         NOT NULL DEFAULT 'Asia/Bangkok',
    period_key      VARCHAR(12)  NOT NULL DEFAULT '',
    last_seq        BIGINT       NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_system_code_prefix_code_key
    ON system_code_prefix (code_key) WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS system_code_prefix CASCADE;
DROP TYPE IF EXISTS system_code_format_style;
DROP TYPE IF EXISTS system_code_reset_period;
-- +goose StatementEnd
