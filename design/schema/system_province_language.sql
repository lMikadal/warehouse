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
