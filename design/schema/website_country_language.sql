-- source: v1 website_country_language (split from setting_address_language)
CREATE TABLE website_country_language (
    website_country_id  BIGINT       NOT NULL REFERENCES website_country(id) ON DELETE CASCADE, -- parent country
    locale              VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                TEXT         NOT NULL,                -- localized country name
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (website_country_id, locale),
    CONSTRAINT uq_website_country_language_locale UNIQUE (website_country_id, locale)
);

CREATE INDEX idx_website_country_language_locale ON website_country_language (locale);
