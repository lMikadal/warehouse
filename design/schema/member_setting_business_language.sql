CREATE TABLE member_setting_business_language (
    member_setting_business_id  BIGINT       NOT NULL REFERENCES member_setting_business(id) ON DELETE CASCADE, -- parent business group
    locale                      VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name                        VARCHAR(255) NOT NULL,                -- display name
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_setting_business_id, locale),
    CONSTRAINT uq_member_setting_business_language_locale UNIQUE (member_setting_business_id, locale)
);

CREATE INDEX idx_member_setting_business_language_locale ON member_setting_business_language (locale);
