-- source: v1 setting_sale_platform_language + v2 v2_setting_sale_channel_language
--   - locale FK restored (v2 used bare VARCHAR)
CREATE TABLE setting_sale_channel_language (
    setting_sale_channel_id  BIGINT       NOT NULL REFERENCES setting_sale_channel(id) ON DELETE CASCADE, -- parent channel
    locale                   VARCHAR(10)  NOT NULL REFERENCES website_language(locale)  ON DELETE RESTRICT, -- translation locale
    name                     TEXT         NOT NULL,                -- channel display name
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_sale_channel_id, locale),
    CONSTRAINT uq_setting_sale_channel_language_locale UNIQUE (setting_sale_channel_id, locale)
);

CREATE INDEX idx_setting_sale_channel_language_locale ON setting_sale_channel_language (locale);
