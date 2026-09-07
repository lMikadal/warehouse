-- source: v1 member_member_history_language + v2 v2_member_member_history_language
--   - restored: title + description (v2 collapsed them into a single "name" field)
CREATE TABLE member_history_language (
    member_history_id  BIGINT       NOT NULL REFERENCES member_history(id) ON DELETE CASCADE, -- parent history entry
    locale             VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    title              VARCHAR(255) NOT NULL DEFAULT '',                -- event title
    description        TEXT         NOT NULL DEFAULT '',                -- event detail text
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_history_id, locale),
    CONSTRAINT uq_member_history_language_locale UNIQUE (member_history_id, locale)
);

CREATE INDEX idx_member_history_language_locale ON member_history_language (locale);
