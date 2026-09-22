-- +goose Up
ALTER TABLE order_payment
  ADD COLUMN member_user_id BIGINT REFERENCES member_user(id) ON DELETE SET NULL,
  ADD COLUMN member_setting_credit_id BIGINT REFERENCES member_setting_credit(id) ON DELETE SET NULL,
  ADD COLUMN member_name TEXT,
  ADD COLUMN member_tel TEXT,
  ADD COLUMN member_email TEXT;

CREATE INDEX idx_order_payment_member ON order_payment (member_user_id) WHERE member_user_id IS NOT NULL;
CREATE INDEX idx_order_payment_member_setting_credit ON order_payment (member_setting_credit_id) WHERE member_setting_credit_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_order_payment_member_setting_credit;
DROP INDEX IF EXISTS idx_order_payment_member;
ALTER TABLE order_payment
  DROP COLUMN IF EXISTS member_email,
  DROP COLUMN IF EXISTS member_tel,
  DROP COLUMN IF EXISTS member_name,
  DROP COLUMN IF EXISTS member_setting_credit_id,
  DROP COLUMN IF EXISTS member_user_id;
