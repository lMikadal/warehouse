-- source: v1 member_tier_language + v2 v2_member_tier_language
CREATE TABLE member_tier_language (
    member_tier_id  BIGINT       NOT NULL REFERENCES member_tier(id) ON DELETE CASCADE, -- parent tier
    locale          VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name            VARCHAR(255) NOT NULL,                -- tier display name
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_tier_id, locale),
    CONSTRAINT uq_member_tier_language_locale UNIQUE (member_tier_id, locale)
);

CREATE INDEX idx_member_tier_language_locale ON member_tier_language (locale);
