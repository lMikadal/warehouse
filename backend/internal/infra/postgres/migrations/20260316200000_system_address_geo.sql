-- +goose Up
-- +goose StatementBegin
-- source: v1 system_country (split from v2 setting_address generic table)
--   - root of geo hierarchy; flat list ordered by sort_order
--   - sku: optional admin code e.g. country ISO
CREATE TABLE system_country (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku         TEXT,                                   -- optional country code
    sort_order  INTEGER      NOT NULL DEFAULT 0,       -- UI list order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_system_country_sku
    ON system_country (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_country_active_sort
    ON system_country (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_country_created_by ON system_country (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_country_updated_by ON system_country (updated_by) WHERE updated_by IS NOT NULL;

-- source: v1 system_country_language (split from setting_address_language)
CREATE TABLE system_country_language (
    system_country_id  BIGINT       NOT NULL REFERENCES system_country(id) ON DELETE CASCADE, -- parent country
    locale              VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                TEXT         NOT NULL,                -- localized country name
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_country_id, locale),
    CONSTRAINT uq_system_country_language_locale UNIQUE (system_country_id, locale)
);

CREATE INDEX idx_system_country_language_locale ON system_country_language (locale);

-- source: v1 system_province (split from v2 setting_address generic table)
CREATE TABLE system_province (
    id                  BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_country_id  BIGINT       NOT NULL REFERENCES system_country(id) ON DELETE RESTRICT, -- parent country
    sku                 TEXT,                                   -- optional province code
    sort_order          INTEGER      NOT NULL DEFAULT 0,       -- sibling order under country
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by          BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_province_country_sort
    ON system_province (system_country_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_system_province_sku
    ON system_province (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_province_active_sort
    ON system_province (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_province_created_by ON system_province (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_province_updated_by ON system_province (updated_by) WHERE updated_by IS NOT NULL;

-- source: v1 system_province_language (split from setting_address_language)
CREATE TABLE system_province_language (
    system_province_id  BIGINT       NOT NULL REFERENCES system_province(id) ON DELETE CASCADE, -- parent province
    locale               VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                 TEXT         NOT NULL,                -- localized province name
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_province_id, locale),
    CONSTRAINT uq_system_province_language_locale UNIQUE (system_province_id, locale)
);

CREATE INDEX idx_system_province_language_locale ON system_province_language (locale);

-- source: v1 system_district (split from v2 setting_address generic table)
CREATE TABLE system_district (
    id                   BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_province_id  BIGINT       NOT NULL REFERENCES system_province(id) ON DELETE RESTRICT, -- parent province
    sku                  TEXT,                                   -- optional district code
    sort_order           INTEGER      NOT NULL DEFAULT 0,       -- sibling order under province
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_district_province_sort
    ON system_district (system_province_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_system_district_sku
    ON system_district (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_district_active_sort
    ON system_district (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_district_created_by ON system_district (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_district_updated_by ON system_district (updated_by) WHERE updated_by IS NOT NULL;

-- source: v1 system_district_language (split from setting_address_language)
CREATE TABLE system_district_language (
    system_district_id  BIGINT       NOT NULL REFERENCES system_district(id) ON DELETE CASCADE, -- parent district
    locale               VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                 TEXT         NOT NULL,                -- localized district name
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_district_id, locale),
    CONSTRAINT uq_system_district_language_locale UNIQUE (system_district_id, locale)
);

CREATE INDEX idx_system_district_language_locale ON system_district_language (locale);

-- source: v1 system_sub_district (split from v2 setting_address generic table)
--   - postcode lives here (meaningful at sub-district level only)
CREATE TABLE system_sub_district (
    id                   BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_district_id  BIGINT       NOT NULL REFERENCES system_district(id) ON DELETE RESTRICT, -- parent district
    sku                  TEXT,                                   -- optional sub-district code
    postcode             TEXT,                                   -- postal code for this sub-district
    sort_order           INTEGER      NOT NULL DEFAULT 0,       -- sibling order under district
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_sub_district_district_sort
    ON system_sub_district (system_district_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_system_sub_district_sku
    ON system_sub_district (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_sub_district_active_sort
    ON system_sub_district (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_sub_district_created_by ON system_sub_district (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_sub_district_updated_by ON system_sub_district (updated_by) WHERE updated_by IS NOT NULL;

-- source: v1 system_sub_district_language (split from setting_address_language)
CREATE TABLE system_sub_district_language (
    system_sub_district_id  BIGINT       NOT NULL REFERENCES system_sub_district(id) ON DELETE CASCADE, -- parent sub-district
    locale                   VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                     TEXT         NOT NULL,                -- localized sub-district name
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_sub_district_id, locale),
    CONSTRAINT uq_system_sub_district_language_locale UNIQUE (system_sub_district_id, locale)
);

CREATE INDEX idx_system_sub_district_language_locale ON system_sub_district_language (locale);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS system_sub_district_language, system_sub_district, system_district_language, system_district, system_province_language, system_province, system_country_language, system_country CASCADE;
-- +goose StatementEnd
