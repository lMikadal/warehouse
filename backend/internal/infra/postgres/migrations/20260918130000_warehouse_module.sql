-- +goose Up
-- +goose StatementBegin
-- source: design/schema/warehouse_list.sql, warehouse_list_language.sql, warehouse_condition.sql

CREATE TYPE warehouse_list_type AS ENUM ('warehouse', 'zone', 'shelf', 'rack', 'bin');

CREATE TABLE warehouse_list (
    id              BIGSERIAL              PRIMARY KEY,
    type            warehouse_list_type    NOT NULL,
    sku             TEXT                   NOT NULL,
    barcode         VARCHAR(255),
    qrcode          VARCHAR(255),
    rfid            VARCHAR(255),
    parent_id       BIGINT                 REFERENCES warehouse_list(id) ON DELETE RESTRICT,
    tree_path       LTREE                  NOT NULL,
    sort_order      INTEGER                NOT NULL DEFAULT 0,
    capacity        INTEGER                NOT NULL DEFAULT 0,
    is_active       BOOLEAN                NOT NULL DEFAULT TRUE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT                 REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT                 REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_warehouse_list_tree_path ON warehouse_list USING GIST (tree_path);
CREATE UNIQUE INDEX uq_warehouse_list_sku
    ON warehouse_list (sku)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_warehouse_list_tree_path
    ON warehouse_list (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_list_parent_sort
    ON warehouse_list (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_list_type_active
    ON warehouse_list (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_warehouse_list_created_by ON warehouse_list (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_warehouse_list_updated_by ON warehouse_list (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE warehouse_list_language (
    warehouse_list_id  BIGINT       NOT NULL REFERENCES warehouse_list(id) ON DELETE CASCADE,
    locale               VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name                 VARCHAR(255) NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_list_id, locale),
    CONSTRAINT uq_warehouse_list_language_locale UNIQUE (warehouse_list_id, locale)
);

CREATE INDEX idx_warehouse_list_language_locale ON warehouse_list_language (locale);

CREATE TABLE warehouse_condition (
    warehouse_list_id  BIGINT              NOT NULL REFERENCES warehouse_list(id) ON DELETE CASCADE,
    type               warehouse_list_type NOT NULL,
    amount             INTEGER             NOT NULL DEFAULT 0,
    amount_active      INTEGER             NOT NULL DEFAULT 0,
    PRIMARY KEY (warehouse_list_id, type)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS warehouse_condition, warehouse_list_language, warehouse_list CASCADE;
DROP TYPE IF EXISTS warehouse_list_type;
-- +goose StatementEnd
