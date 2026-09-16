-- +goose Up
-- +goose StatementBegin
UPDATE system_menu
SET path = '/admin/supplier', updated_at = NOW()
WHERE id = 22 AND module = 'supplier' AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE system_menu
SET path = '/admin/supplier/users', updated_at = NOW()
WHERE id = 22 AND module = 'supplier' AND deleted_at IS NULL;
-- +goose StatementEnd
