-- source: v1 website_language (UUID→BIGSERIAL; column "language" renamed to "locale")
-- locale registry — every *_language table FKs here; FK on language tables uses ON DELETE RESTRICT
CREATE TABLE website_language (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    locale      VARCHAR(10)  NOT NULL,                -- BCP-47-style code; FK target for *_language
    name        VARCHAR(255) NOT NULL,                -- display name e.g. "ไทย", "English"
    sort_order  INTEGER      NOT NULL DEFAULT 100,    -- UI picker order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,   -- selectable in locale pickers
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,  -- at most one active default
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_website_language_locale  UNIQUE (locale),
    CONSTRAINT chk_website_language_locale CHECK  (locale ~ '^[a-z]{2,10}$')
);

-- at most one active default locale
CREATE UNIQUE INDEX uq_website_language_one_default
    ON website_language ((TRUE))
    WHERE is_default = TRUE AND deleted_at IS NULL AND is_active = TRUE;

CREATE INDEX idx_website_language_active_sort
    ON website_language (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_website_language_sort       ON website_language (sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_website_language_created_by ON website_language (created_by)  WHERE created_by IS NOT NULL;
CREATE INDEX idx_website_language_updated_by ON website_language (updated_by)  WHERE updated_by IS NOT NULL;
