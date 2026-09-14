-- source: new lookup companion for setting_prefix display names
CREATE TABLE setting_prefix_language (
    setting_prefix_id  BIGINT       NOT NULL REFERENCES setting_prefix(id) ON DELETE CASCADE, -- parent prefix
    locale             VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name               VARCHAR(255) NOT NULL,                -- prefix display label (e.g. นาย, บริษัท จำกัด)
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_prefix_id, locale),
    CONSTRAINT uq_setting_prefix_language_locale UNIQUE (setting_prefix_id, locale)
);

CREATE INDEX idx_setting_prefix_language_locale ON setting_prefix_language (locale);
