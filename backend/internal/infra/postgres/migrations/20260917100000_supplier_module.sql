-- +goose Up
-- +goose StatementBegin
-- source: design/schema/supplier_*.sql

CREATE TYPE supplier_information_type AS ENUM ('contact', 'tax_invoice', 'delivery');

CREATE TABLE supplier_user (
    id                BIGSERIAL    PRIMARY KEY,
    sku               VARCHAR(255) NOT NULL,
    credit_term       INTEGER,
    credit_term_note  TEXT,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_supplier_user_sku   ON supplier_user (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_user_active      ON supplier_user (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_user_created_by  ON supplier_user (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_user_updated_by  ON supplier_user (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE supplier_information (
    supplier_user_id         BIGINT                    NOT NULL REFERENCES supplier_user(id) ON DELETE CASCADE,
    type                     supplier_information_type NOT NULL,
    setting_prefix_id        BIGINT                    REFERENCES setting_prefix(id) ON DELETE SET NULL,
    name                     VARCHAR(255),
    branch                   entity_branch,
    branch_name              VARCHAR(255),
    tax_number               VARCHAR(50),
    address                  TEXT,
    website_province_id      BIGINT                    REFERENCES system_province(id) ON DELETE SET NULL,
    website_district_id      BIGINT                    REFERENCES system_district(id) ON DELETE SET NULL,
    website_sub_district_id  BIGINT                    REFERENCES system_sub_district(id) ON DELETE SET NULL,
    postcode                 VARCHAR(20),
    tel                      VARCHAR(50),
    email                    VARCHAR(255),
    is_same_information      BOOLEAN                   NOT NULL DEFAULT FALSE,
    PRIMARY KEY (supplier_user_id, type)
);

CREATE INDEX idx_supplier_information_supplier  ON supplier_information (supplier_user_id);
CREATE INDEX idx_supplier_information_prefix    ON supplier_information (setting_prefix_id) WHERE setting_prefix_id IS NOT NULL;
CREATE INDEX idx_supplier_information_province  ON supplier_information (website_province_id)     WHERE website_province_id IS NOT NULL;
CREATE INDEX idx_supplier_information_district  ON supplier_information (website_district_id)     WHERE website_district_id IS NOT NULL;
CREATE INDEX idx_supplier_information_sub       ON supplier_information (website_sub_district_id) WHERE website_sub_district_id IS NOT NULL;

CREATE TABLE supplier_contact (
    id                    BIGSERIAL    PRIMARY KEY,
    supplier_user_id      BIGINT       NOT NULL REFERENCES supplier_user(id) ON DELETE CASCADE,
    name                  VARCHAR(255) NOT NULL,
    email                 VARCHAR(255),
    tel                   VARCHAR(50),
    position              VARCHAR(255),
    sort_order            INTEGER      NOT NULL DEFAULT 100,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_supplier_contact_supplier  ON supplier_contact (supplier_user_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_contact_created_by ON supplier_contact (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_contact_updated_by ON supplier_contact (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE supplier_bank (
    id                    BIGSERIAL    PRIMARY KEY,
    supplier_user_id      BIGINT       NOT NULL REFERENCES supplier_user(id) ON DELETE CASCADE,
    setting_bank_id       BIGINT       NOT NULL REFERENCES setting_bank(id) ON DELETE RESTRICT,
    name                  VARCHAR(255) NOT NULL,
    number                VARCHAR(100) NOT NULL,
    branch                VARCHAR(255),
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default            BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order            INTEGER      NOT NULL DEFAULT 100,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_supplier_bank_supplier     ON supplier_bank (supplier_user_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_bank_setting_bank ON supplier_bank (setting_bank_id);
CREATE INDEX idx_supplier_bank_created_by   ON supplier_bank (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_bank_updated_by   ON supplier_bank (updated_by) WHERE updated_by IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS supplier_bank;
DROP TABLE IF EXISTS supplier_contact;
DROP TABLE IF EXISTS supplier_information;
DROP TABLE IF EXISTS supplier_user;
DROP TYPE IF EXISTS supplier_information_type;
-- +goose StatementEnd
