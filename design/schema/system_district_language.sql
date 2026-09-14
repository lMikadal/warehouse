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
