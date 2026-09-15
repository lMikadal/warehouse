-- +goose Up
-- +goose StatementBegin
-- source: design/schema/setting_*.sql (settings sidebar — 7 CRUD modules)

CREATE TYPE setting_vat_type AS ENUM ('exclude', 'include');
CREATE TYPE setting_prefix_type AS ENUM ('person', 'company');

CREATE TABLE setting_vat (
    id          BIGSERIAL        PRIMARY KEY,
    vat_type    setting_vat_type NOT NULL DEFAULT 'exclude',
    rate        NUMERIC(5,2)     NOT NULL DEFAULT 0,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT           REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT           REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_vat_active     ON setting_vat (created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_setting_vat_created_by ON setting_vat (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_vat_updated_by ON setting_vat (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_code (
    id          BIGSERIAL    PRIMARY KEY,
    code        VARCHAR(255) NOT NULL,
    value       VARCHAR(255) NOT NULL,
    sort_order  INTEGER      NOT NULL DEFAULT 100,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_code_active_sort ON setting_code (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_code_created_by  ON setting_code (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_code_updated_by  ON setting_code (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_bank (
    id             BIGSERIAL PRIMARY KEY,
    system_file_id BIGINT       REFERENCES system_file(id) ON DELETE RESTRICT,
    sort_order     INTEGER      NOT NULL DEFAULT 100,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by     BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_bank_file        ON setting_bank (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_setting_bank_active_sort ON setting_bank (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_bank_created_by  ON setting_bank (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_bank_updated_by  ON setting_bank (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_bank_language (
    setting_bank_id  BIGINT       NOT NULL REFERENCES setting_bank(id) ON DELETE CASCADE,
    locale           VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name             VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_bank_id, locale),
    CONSTRAINT uq_setting_bank_language_locale UNIQUE (setting_bank_id, locale)
);

CREATE INDEX idx_setting_bank_language_locale ON setting_bank_language (locale);

CREATE TABLE setting_payment_method (
    id          BIGSERIAL PRIMARY KEY,
    is_sale     BOOLEAN      NOT NULL DEFAULT TRUE,
    is_purchase BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL DEFAULT 100,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_payment_method_sale
    ON setting_payment_method (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE AND is_sale = TRUE;
CREATE INDEX idx_setting_payment_method_purchase
    ON setting_payment_method (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE AND is_purchase = TRUE;
CREATE INDEX idx_setting_payment_method_created_by ON setting_payment_method (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_payment_method_updated_by ON setting_payment_method (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_payment_method_language (
    setting_payment_method_id  BIGINT       NOT NULL REFERENCES setting_payment_method(id) ON DELETE CASCADE,
    locale                     VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name                       VARCHAR(255) NOT NULL,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_payment_method_id, locale),
    CONSTRAINT uq_setting_payment_method_language_locale UNIQUE (setting_payment_method_id, locale)
);

CREATE INDEX idx_setting_payment_method_language_locale ON setting_payment_method_language (locale);

CREATE TABLE setting_claim_reason (
    id          BIGSERIAL PRIMARY KEY,
    is_claim    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_return   BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_setting_claim_reason_type CHECK (is_claim OR is_return)
);

CREATE INDEX idx_setting_claim_reason_type_active
    ON setting_claim_reason (is_claim, is_return, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_claim_reason_created_by ON setting_claim_reason (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_claim_reason_updated_by ON setting_claim_reason (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_claim_reason_language (
    setting_claim_reason_id  BIGINT       NOT NULL REFERENCES setting_claim_reason(id) ON DELETE CASCADE,
    locale                   VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name                     TEXT         NOT NULL,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_claim_reason_id, locale),
    CONSTRAINT uq_setting_claim_reason_language_locale UNIQUE (setting_claim_reason_id, locale)
);

CREATE INDEX idx_setting_claim_reason_language_locale ON setting_claim_reason_language (locale);

CREATE TABLE setting_prefix (
    id          BIGSERIAL           PRIMARY KEY,
    type        setting_prefix_type NOT NULL,
    code        VARCHAR(50)         NOT NULL,
    sort_order  INTEGER             NOT NULL DEFAULT 0,
    is_active   BOOLEAN             NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT              REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT              REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_setting_prefix_code
    ON setting_prefix (code)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_setting_prefix_type_active
    ON setting_prefix (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_prefix_created_by ON setting_prefix (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_prefix_updated_by ON setting_prefix (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_prefix_language (
    setting_prefix_id  BIGINT       NOT NULL REFERENCES setting_prefix(id) ON DELETE CASCADE,
    locale             VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name               VARCHAR(255) NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_prefix_id, locale),
    CONSTRAINT uq_setting_prefix_language_locale UNIQUE (setting_prefix_id, locale)
);

CREATE INDEX idx_setting_prefix_language_locale ON setting_prefix_language (locale);

-- ponytail: member_setting_relation FK deferred until member module migration wave
CREATE TABLE setting_sale_channel (
    id                         BIGSERIAL PRIMARY KEY,
    system_file_id             BIGINT       REFERENCES system_file(id) ON DELETE RESTRICT,
    is_active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default                 BOOLEAN      NOT NULL DEFAULT FALSE,
    member_setting_relation_id BIGINT,
    sort_order                 INTEGER      NOT NULL DEFAULT 100,
    deleted_at                 TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                 BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                 BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_sale_channel_file
    ON setting_sale_channel (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_setting_sale_channel_active
    ON setting_sale_channel (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_sale_channel_relation
    ON setting_sale_channel (member_setting_relation_id)
    WHERE member_setting_relation_id IS NOT NULL;
CREATE INDEX idx_setting_sale_channel_created_by ON setting_sale_channel (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_sale_channel_updated_by ON setting_sale_channel (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE setting_sale_channel_language (
    setting_sale_channel_id  BIGINT       NOT NULL REFERENCES setting_sale_channel(id) ON DELETE CASCADE,
    locale                   VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name                     TEXT         NOT NULL,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_sale_channel_id, locale),
    CONSTRAINT uq_setting_sale_channel_language_locale UNIQUE (setting_sale_channel_id, locale)
);

CREATE INDEX idx_setting_sale_channel_language_locale ON setting_sale_channel_language (locale);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS
    setting_sale_channel_language,
    setting_sale_channel,
    setting_prefix_language,
    setting_prefix,
    setting_claim_reason_language,
    setting_claim_reason,
    setting_payment_method_language,
    setting_payment_method,
    setting_bank_language,
    setting_bank,
    setting_code,
    setting_vat
CASCADE;
DROP TYPE IF EXISTS setting_prefix_type;
DROP TYPE IF EXISTS setting_vat_type;
-- +goose StatementEnd
