-- Init document-number prefix counters (idempotent).
-- Requires: migration 20260919130000_system_code_prefix.sql.

INSERT INTO system_code_prefix (
  id, code_key, prefix, reset_period, format_style, seq_width, timezone, period_key, last_seq, is_active, created_at, updated_at
)
VALUES
  (1, 'member_user', 'MEM', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'order_list', 'PJB', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'purchase_order', 'PO', 'month', 'prefix_yyyymm_dash_seq', 5, 'Asia/Bangkok', '', 0, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
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
