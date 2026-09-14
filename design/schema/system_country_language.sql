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
