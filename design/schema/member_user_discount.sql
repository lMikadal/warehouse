-- source: v1 member_member_discounts + v2 v2_member_member_discounts (UUID→BIGSERIAL)
--   - restored: is_active (v2 dropped it)
--   - restored: unique (member_user_id, member_credit_id, product_item_id) — v2 dropped; prevents duplicate rules
--   - restored: product_item_id FK (v2 had no FK declared)
--   - member_credit_id: optional credit type context (เงินสด/เงินเชื่อ)
CREATE TABLE member_user_discount (
    id              BIGSERIAL            PRIMARY KEY,              -- surrogate PK
    member_user_id  BIGINT               NOT NULL REFERENCES member_user(id)            ON DELETE CASCADE, -- member receiving discount
    member_credit_id BIGINT              REFERENCES member_setting_credit(id) ON DELETE SET NULL, -- credit type context (optional)
    product_item_id BIGINT              NOT NULL REFERENCES product_item(id)    ON DELETE RESTRICT, -- SKU or product item
    minimum_qty     NUMERIC(15,4)        NOT NULL DEFAULT 0,       -- min quantity to apply
    discount        NUMERIC(15,4)        NOT NULL DEFAULT 0,       -- discount value
    discount_type   discount_unit NOT NULL DEFAULT 'percent', -- percent or fixed baht
    date_start      DATE,                                           -- valid-from date
    date_end        DATE,                                           -- valid-until date
    is_active       BOOLEAN              NOT NULL DEFAULT TRUE,   -- whether rule is enforced
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_user_discount_user_credit_item
    ON member_user_discount (member_user_id, member_credit_id, product_item_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_discount_user        ON member_user_discount (member_user_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_discount_credit      ON member_user_discount (member_credit_id) WHERE member_credit_id IS NOT NULL;
CREATE INDEX idx_member_user_discount_item        ON member_user_discount (product_item_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_discount_date_end    ON member_user_discount (date_end)        WHERE date_end IS NOT NULL;
CREATE INDEX idx_member_user_discount_created_by  ON member_user_discount (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_user_discount_updated_by  ON member_user_discount (updated_by) WHERE updated_by IS NOT NULL;
