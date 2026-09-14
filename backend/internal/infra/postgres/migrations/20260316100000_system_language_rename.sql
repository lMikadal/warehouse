-- +goose Up
-- Applied migrations only created uq_website_language_one_default + idx_website_language_active_sort (not design-only sort/audit indexes).
ALTER TABLE website_language RENAME TO system_language;

ALTER TABLE system_language RENAME CONSTRAINT uq_website_language_locale TO uq_system_language_locale;
ALTER TABLE system_language RENAME CONSTRAINT chk_website_language_locale TO chk_system_language_locale;

ALTER INDEX uq_website_language_one_default RENAME TO uq_system_language_one_default;
ALTER INDEX idx_website_language_active_sort RENAME TO idx_system_language_active_sort;

-- +goose Down
ALTER INDEX idx_system_language_active_sort RENAME TO idx_website_language_active_sort;
ALTER INDEX uq_system_language_one_default RENAME TO uq_website_language_one_default;

ALTER TABLE system_language RENAME CONSTRAINT chk_system_language_locale TO chk_website_language_locale;
ALTER TABLE system_language RENAME CONSTRAINT uq_system_language_locale TO uq_website_language_locale;

ALTER TABLE system_language RENAME TO website_language;
