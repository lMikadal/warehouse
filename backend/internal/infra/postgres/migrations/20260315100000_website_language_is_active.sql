-- +goose Up
ALTER TABLE website_language ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

DROP INDEX IF EXISTS uq_website_language_one_default;
CREATE UNIQUE INDEX uq_website_language_one_default
    ON website_language ((TRUE))
    WHERE is_default = TRUE AND deleted_at IS NULL AND is_active = TRUE;

CREATE INDEX idx_website_language_active_sort
    ON website_language (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_website_language_active_sort;

DROP INDEX IF EXISTS uq_website_language_one_default;
CREATE UNIQUE INDEX uq_website_language_one_default
    ON website_language ((TRUE))
    WHERE is_default = TRUE AND deleted_at IS NULL;

ALTER TABLE website_language DROP COLUMN IF EXISTS is_active;
