-- source: v1 setting_bank_language
CREATE TABLE setting_bank_language (
    setting_bank_id  BIGINT       NOT NULL REFERENCES setting_bank(id) ON DELETE CASCADE, -- parent bank
    locale           VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name             VARCHAR(255) NOT NULL,                -- bank display name
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_bank_id, locale),
    CONSTRAINT uq_setting_bank_language_locale UNIQUE (setting_bank_id, locale)
);

CREATE INDEX idx_setting_bank_language_locale ON setting_bank_language (locale);
