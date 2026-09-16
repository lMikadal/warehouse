-- +goose Up
-- +goose StatementBegin
ALTER TABLE setting_vat
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE setting_vat DROP COLUMN IF EXISTS is_active;
-- +goose StatementEnd
