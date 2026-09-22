-- +goose Up
ALTER TABLE order_claim
  ADD COLUMN note_supplier TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE order_claim
  DROP COLUMN IF EXISTS note_supplier;
