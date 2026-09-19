-- +goose Up
-- +goose StatementBegin
ALTER TABLE member_address RENAME TO member_user_address;
ALTER TABLE member_discount RENAME TO member_user_discount;
ALTER TABLE member_file RENAME TO member_user_file;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE member_user_file RENAME TO member_file;
ALTER TABLE member_user_discount RENAME TO member_discount;
ALTER TABLE member_user_address RENAME TO member_address;
-- +goose StatementEnd
