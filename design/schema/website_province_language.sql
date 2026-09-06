-- source: v1 website_province_language (split from setting_address_language)
CREATE TABLE website_province_language (
    website_province_id  BIGINT       NOT NULL REFERENCES website_province(id) ON DELETE CASCADE, -- parent province
    locale               VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name                 TEXT         NOT NULL,                -- localized province name
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (website_province_id, locale),
    CONSTRAINT uq_website_province_language_locale UNIQUE (website_province_id, locale)
);

CREATE INDEX idx_website_province_language_locale ON website_province_language (locale);
