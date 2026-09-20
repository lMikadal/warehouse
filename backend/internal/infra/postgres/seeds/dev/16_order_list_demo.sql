-- Demo store sales orders (dev only; idempotent by fixed ids)
-- SKU shape matches system_code_prefix order_list: PJB-{YYYYMM}-{seq:5}[-{family}]
INSERT INTO order_list (
  id, sku, status, fulfill_status, parent_id, member_user_id, member_setting_credit_id,
  member_name, member_tel, member_email, vat_type, vat_rate, ordered_at,
  created_at, updated_at, created_by, updated_by
) VALUES
  (1, 'PJB-202601-00005-01', 'success', 'success', NULL, 1, 1, 'สมชาย ใจดี', '081-2345678', 'test@example.com', 'exclude', 7.00, '2026-01-05T10:00:00Z', '2026-01-05T10:00:00Z', '2026-01-05T10:00:00Z', 1, 1),
  (2, 'PJB-202602-00010-01', 'pending', 'pending', NULL, 1, 1, 'สมชาย ใจดี', '081-2345678', NULL, 'exclude', 7.00, '2026-02-20T09:00:00Z', '2026-02-20T09:00:00Z', '2026-02-20T09:00:00Z', 1, 1),
  (3, 'PJB-202603-00025-01', 'draft', 'pending', NULL, NULL, NULL, 'Walk-in', NULL, NULL, 'exclude', 7.00, NULL, '2026-03-25T08:00:00Z', '2026-03-25T08:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  status = EXCLUDED.status,
  fulfill_status = EXCLUDED.fulfill_status,
  member_name = EXCLUDED.member_name,
  member_tel = EXCLUDED.member_tel,
  member_email = EXCLUDED.member_email,
  vat_type = EXCLUDED.vat_type,
  vat_rate = EXCLUDED.vat_rate,
  ordered_at = EXCLUDED.ordered_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('order_list', 'id'), GREATEST((SELECT MAX(id) FROM order_list), 3));

INSERT INTO order_list_item (
  id, order_list_id, product_item_id, type, amount, price_per_unit, discount, total_price, created_by, updated_by
) VALUES
  (1, 1, 1, 'item', 10, 10.0000, 0.0000, 100.0000, 1, 1),
  (2, 1, 2, 'item', 2, 18.0000, 0.0000, 36.0000, 1, 1),
  (3, 2, 1, 'item', 25, 9.5000, 0.5000, 225.0000, 1, 1),
  (4, 3, 1, 'item', 15, 10.0000, 0.0000, 150.0000, 1, 1),
  (5, 3, 2, 'item', 5, 19.0000, 1.0000, 90.0000, 1, 1)
ON CONFLICT (id) DO UPDATE SET
  order_list_id = EXCLUDED.order_list_id,
  product_item_id = EXCLUDED.product_item_id,
  amount = EXCLUDED.amount,
  price_per_unit = EXCLUDED.price_per_unit,
  discount = EXCLUDED.discount,
  total_price = EXCLUDED.total_price,
  deleted_at = NULL,
  updated_at = NOW();

UPDATE order_list_item
SET total_price = GREATEST(0, amount * price_per_unit - discount),
    updated_at = NOW()
WHERE deleted_at IS NULL AND total_price = 0 AND type = 'item';

SELECT setval(pg_get_serial_sequence('order_list_item', 'id'), GREATEST((SELECT MAX(id) FROM order_list_item), 5));

-- Keep order_list document counter ahead of seeded base SKUs for the current Bangkok month (if any).
WITH parsed AS (
  SELECT
    (regexp_match(sku, '^PJB-([0-9]{6})-([0-9]{5})(?:-[0-9]+)?$'))[1] AS yyyymm,
    ((regexp_match(sku, '^PJB-([0-9]{6})-([0-9]{5})(?:-[0-9]+)?$'))[2])::bigint AS seq
  FROM order_list
  WHERE deleted_at IS NULL AND sku IS NOT NULL
),
cur AS (
  SELECT to_char((NOW() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYYMM') AS yyyymm
),
month_max AS (
  SELECT p.yyyymm, MAX(p.seq) AS max_seq
  FROM parsed p
  INNER JOIN cur c ON c.yyyymm = p.yyyymm
  GROUP BY p.yyyymm
)
UPDATE system_code_prefix scp
SET
  period_key = mm.yyyymm,
  last_seq = GREATEST(scp.last_seq, mm.max_seq),
  updated_at = NOW()
FROM month_max mm
WHERE scp.code_key = 'order_list';
