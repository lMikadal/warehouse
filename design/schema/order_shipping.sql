-- source: v2 v2_order_bill_shipping + v2_order_order_shipping merged (1:1 → single table)
--   - 1:1 with order_order (PK = order_order_id, no surrogate)
CREATE TYPE order_shipping_type AS ENUM ('store', 'parking', 'delivery');

CREATE TABLE order_shipping (
    order_order_id  BIGINT              NOT NULL REFERENCES order_order(id) ON DELETE CASCADE, -- parent order (1:1 PK)
    type            order_shipping_type NOT NULL DEFAULT 'store', -- store pickup, parking, or delivery
    received_at     TIMESTAMPTZ,                             -- goods received timestamp
    PRIMARY KEY (order_order_id)
);
