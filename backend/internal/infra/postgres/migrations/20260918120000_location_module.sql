-- +goose Up
-- +goose StatementBegin
-- source: design/schema/location_location.sql, location_location_language.sql

CREATE TABLE location_location (
    id          BIGSERIAL    PRIMARY KEY,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_location_location_active_sort ON location_location (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_location_location_created_by  ON location_location (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_location_location_updated_by  ON location_location (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE location_location_language (
    location_location_id  BIGINT       NOT NULL REFERENCES location_location(id) ON DELETE CASCADE,
    locale                VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name                  VARCHAR(255) NOT NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (location_location_id, locale),
    CONSTRAINT uq_location_location_language_locale UNIQUE (location_location_id, locale)
);

CREATE INDEX idx_location_location_language_locale ON location_location_language (locale);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS location_location_language, location_location CASCADE;
-- +goose StatementEnd
