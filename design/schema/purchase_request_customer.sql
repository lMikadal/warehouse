-- source: v1 order_tickets customer_* columns (split out from purchase_request)
--   - 1:1 with purchase_request (PK = purchase_request_id, no surrogate)
--   - member_member_id: optional FK to member account (walk-in customers may have none)
--   - sku/name/tel/email: snapshot at request time (denormalized intentionally)
CREATE TABLE purchase_request_customer (
    purchase_request_id  BIGINT       NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE, -- parent request (1:1 PK)
    member_member_id     BIGINT       REFERENCES member_member(id) ON DELETE SET NULL, -- linked member account
    sku                  VARCHAR(255) NOT NULL DEFAULT '',  -- customer reference code
    name                 VARCHAR(255) NOT NULL DEFAULT '',  -- customer name snapshot
    tel                  VARCHAR(100) NOT NULL DEFAULT '',  -- customer phone
    email                VARCHAR(255) NOT NULL DEFAULT '',  -- customer email
    date_receive         TIMESTAMPTZ,                        -- expected receive date
    PRIMARY KEY (purchase_request_id)
);

CREATE INDEX idx_purchase_request_customer_member ON purchase_request_customer (member_member_id) WHERE member_member_id IS NOT NULL;
