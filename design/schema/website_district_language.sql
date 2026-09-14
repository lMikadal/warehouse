-- source: v1 website_district_language (split from setting_address_language)
CREATE TABLE website_district_language (
    website_district_id  BIGINT       NOT NULL REFERENCES website_district(id) ON DELETE CASCADE, -- parent district
    locale               VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                 TEXT         NOT NULL,                -- localized district name
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (website_district_id, locale),
    CONSTRAINT uq_website_district_language_locale UNIQUE (website_district_id, locale)
);

CREATE INDEX idx_website_district_language_locale ON website_district_language (locale);
