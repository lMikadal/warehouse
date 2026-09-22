-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_history.sql, purchase_history_language.sql
-- Replaces the v1 *_by/*_at workflow columns on order_tickets / order_purchases
-- (append-only: no updated_at / deleted_at).

CREATE TABLE purchase_history (
    id                              BIGSERIAL   PRIMARY KEY,
    purchase_order_id               BIGINT      REFERENCES purchase_order(id) ON DELETE SET NULL,
    purchase_order_item_id          BIGINT      REFERENCES purchase_order_item(id) ON DELETE SET NULL,
    purchase_order_item_reject_id   BIGINT      REFERENCES purchase_order_item_reject(id) ON DELETE SET NULL,
    purchase_claim_id               BIGINT      REFERENCES purchase_claim(id) ON DELETE SET NULL,
    purchase_claim_item_id          BIGINT      REFERENCES purchase_claim_item(id) ON DELETE SET NULL,
    purchase_request_id             BIGINT      REFERENCES purchase_request(id) ON DELETE SET NULL,
    purchase_request_item_id        BIGINT      REFERENCES purchase_request_item(id) ON DELETE SET NULL,
    purchase_request_item_reject_id BIGINT      REFERENCES purchase_request_item_reject(id) ON DELETE SET NULL,
    old_status                      TEXT,
    new_status                      TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                      BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchase_history_order          ON purchase_history (purchase_order_id, created_at DESC) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX idx_purchase_history_request        ON purchase_history (purchase_request_id, created_at DESC) WHERE purchase_request_id IS NOT NULL;
CREATE INDEX idx_purchase_history_order_item     ON purchase_history (purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;
CREATE INDEX idx_purchase_history_request_item   ON purchase_history (purchase_request_item_id) WHERE purchase_request_item_id IS NOT NULL;
CREATE INDEX idx_purchase_history_reject         ON purchase_history (purchase_order_item_reject_id, created_at DESC) WHERE purchase_order_item_reject_id IS NOT NULL;
CREATE INDEX idx_purchase_history_request_reject ON purchase_history (purchase_request_item_reject_id) WHERE purchase_request_item_reject_id IS NOT NULL;
CREATE INDEX idx_purchase_history_claim          ON purchase_history (purchase_claim_id, created_at DESC) WHERE purchase_claim_id IS NOT NULL;
CREATE INDEX idx_purchase_history_claim_item     ON purchase_history (purchase_claim_item_id) WHERE purchase_claim_item_id IS NOT NULL;
CREATE INDEX idx_purchase_history_created_by     ON purchase_history (created_by) WHERE created_by IS NOT NULL;

CREATE TABLE purchase_history_language (
    purchase_history_id BIGINT       NOT NULL REFERENCES purchase_history(id) ON DELETE CASCADE,
    locale              VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    title               VARCHAR(255) NOT NULL DEFAULT '',
    description         TEXT         NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (purchase_history_id, locale)
);

CREATE INDEX idx_purchase_history_language_locale ON purchase_history_language (locale);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS purchase_history_language CASCADE;
DROP TABLE IF EXISTS purchase_history CASCADE;
-- +goose StatementEnd
