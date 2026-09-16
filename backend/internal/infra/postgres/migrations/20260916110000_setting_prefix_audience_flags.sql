-- +goose Up
ALTER TABLE setting_prefix
    ADD COLUMN is_person BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN is_company BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE setting_prefix SET is_person = TRUE, is_company = FALSE WHERE type = 'person';
UPDATE setting_prefix SET is_person = FALSE, is_company = TRUE WHERE type = 'company';

ALTER TABLE setting_prefix
    ADD CONSTRAINT chk_setting_prefix_audience CHECK (is_person OR is_company);

DROP INDEX IF EXISTS idx_setting_prefix_type_active;
DROP INDEX IF EXISTS uq_setting_prefix_code;

ALTER TABLE setting_prefix DROP COLUMN code;
ALTER TABLE setting_prefix DROP COLUMN type;

DROP TYPE IF EXISTS setting_prefix_type;

CREATE INDEX idx_setting_prefix_audience_active
    ON setting_prefix (is_person, is_company, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;

-- +goose Down
CREATE TYPE setting_prefix_type AS ENUM ('person', 'company');

ALTER TABLE setting_prefix
    ADD COLUMN type setting_prefix_type,
    ADD COLUMN code VARCHAR(50);

UPDATE setting_prefix SET type = 'person', code = 'legacy_' || id::text WHERE is_person AND NOT is_company;
UPDATE setting_prefix SET type = 'company', code = 'legacy_' || id::text WHERE is_company AND NOT is_person;
UPDATE setting_prefix SET type = 'company', code = 'legacy_' || id::text WHERE is_person AND is_company;

ALTER TABLE setting_prefix ALTER COLUMN type SET NOT NULL;
ALTER TABLE setting_prefix ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX uq_setting_prefix_code ON setting_prefix (code) WHERE deleted_at IS NULL;
CREATE INDEX idx_setting_prefix_type_active ON setting_prefix (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;

ALTER TABLE setting_prefix DROP CONSTRAINT IF EXISTS chk_setting_prefix_audience;
DROP INDEX IF EXISTS idx_setting_prefix_audience_active;

ALTER TABLE setting_prefix DROP COLUMN is_person;
ALTER TABLE setting_prefix DROP COLUMN is_company;
