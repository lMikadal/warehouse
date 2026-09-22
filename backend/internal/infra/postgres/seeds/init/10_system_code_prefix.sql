-- Init document-number prefix counters (idempotent).
-- Requires: migration 20260919130000_system_code_prefix.sql.

INSERT INTO system_code_prefix (
  id, code_key, prefix, reset_period, format_style, seq_width, timezone, period_key, last_seq, is_active, created_at, updated_at
)
VALUES
  (1, 'member_user', 'MEM', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'order_list', 'PJB', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'purchase_order', 'PO', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'order_quotation', 'QT', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  -- Draft counters keep v1's separate PO(T)/RJ(T) series so a document keeps its draft number after promotion.
  (5, 'purchase_order_draft', 'PO(T)', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'purchase_request', 'TK', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  -- v1 numbered purchase rejects CLM-…; CLM belongs to the sales claim here, so the purchase side uses RJ.
  (7, 'purchase_order_item_reject', 'RJ', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'purchase_order_item_reject_draft', 'RJ(T)', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 'purchase_claim', 'PCL', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 'order_claim', 'CLM', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  -- Sales payment documents keep v1's two series: a loan is an invoice, a settled payment a receipt.
  (11, 'order_payment_invoice', 'INV', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 'order_payment_receipt', 'REV', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  code_key = EXCLUDED.code_key,
  prefix = EXCLUDED.prefix,
  reset_period = EXCLUDED.reset_period,
  format_style = EXCLUDED.format_style,
  seq_width = EXCLUDED.seq_width,
  timezone = EXCLUDED.timezone,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('system_code_prefix', 'id'), GREATEST((SELECT MAX(id) FROM system_code_prefix), 1));
