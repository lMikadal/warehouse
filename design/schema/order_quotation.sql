-- Quotation header (ใบเสนอราคา). No compare lines; separate from store order_list.
--   - status: document lifecycle (approved = superadmin signed off; success = paid/closed flow)
--   - issue_date / valid_until: document dates; overdue is query-only
--   - accept_mode: payment | credit when sales accepts
--   - credit_date: due date when accept_mode = credit
--   - parent_id: new QT from modal สร้างใบเสนอราคาใหม่
--   - Links to order/payment via order_list.order_quotation_id and order_payment.order_quotation_id
CREATE TYPE order_quotation_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'success',
    'cancelled',
    'rejected'
);

CREATE TYPE order_quotation_accept_mode AS ENUM ('payment', 'credit');

CREATE TABLE order_quotation (
    id                        BIGSERIAL                    PRIMARY KEY,
    sku                       TEXT,
    status                    order_quotation_status       NOT NULL DEFAULT 'draft',
    member_user_id            BIGINT                       REFERENCES member_user(id) ON DELETE SET NULL,
    member_setting_credit_id  BIGINT                       REFERENCES member_setting_credit(id) ON DELETE SET NULL,
    member_name               TEXT,
    member_tel                TEXT,
    member_email              TEXT,
    issue_date                DATE,
    valid_until               DATE,
    reserve_stock             BOOLEAN                      NOT NULL DEFAULT FALSE,
    notes                     TEXT,
    accept_mode               order_quotation_accept_mode,
    accepted_at               TIMESTAMPTZ,
    credit_date               DATE,
    vat_type                  setting_vat_type             NOT NULL DEFAULT 'exclude',
    vat_rate                  NUMERIC(5,2)                 NOT NULL DEFAULT 0,
    subtotal_ex_vat           NUMERIC(15,4)                NOT NULL DEFAULT 0,
    discount_total            NUMERIC(15,4)                NOT NULL DEFAULT 0,
    vat_amount                NUMERIC(15,4)                NOT NULL DEFAULT 0,
    grand_total               NUMERIC(15,4)                NOT NULL DEFAULT 0,
    parent_id                 BIGINT                       REFERENCES order_quotation(id) ON DELETE SET NULL,
    deleted_at                TIMESTAMPTZ,
    created_at                TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_order_quotation_sku UNIQUE (sku)
);

CREATE INDEX idx_order_quotation_status       ON order_quotation (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_quotation_member       ON order_quotation (member_user_id) WHERE member_user_id IS NOT NULL;
CREATE INDEX idx_order_quotation_valid_until  ON order_quotation (valid_until) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_quotation_created_by   ON order_quotation (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_quotation_created_at   ON order_quotation (created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_quotation_parent       ON order_quotation (parent_id) WHERE parent_id IS NOT NULL;
