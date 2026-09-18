-- Dev purchase order demo — mirrors design/js/seed/purchase_order.js + purchase_order_item.js
-- Requires: 11_supplier_demo.sql, migration 20260918180000_purchase_order_module.sql
-- Also embedded in 14_product_demo.sql (before stock). This file re-upserts after 14_product_demo (alphabetical order).

INSERT INTO purchase_order (
  id, sku, purchase_request_id, supplier_user_id, status, ordered_at,
  vat_type, vat_rate, discount, special_discount, total_price, note,
  created_by, updated_by, created_at, updated_at
)
VALUES
  (1, 'PO-2026010004', NULL, 1, 'receive_completed', '2026-01-04T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2026-01-04T10:00:00.000Z', '2026-01-04T10:00:00.000Z'),
  (2, 'PO-2026010006', NULL, 1, 'receive_completed', '2026-01-06T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2026-01-06T10:00:00.000Z', '2026-01-06T10:00:00.000Z'),
  (3, 'PO-2026020018', NULL, 2, 'receive_completed', '2026-02-18T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2026-02-18T10:00:00.000Z', '2026-02-18T10:00:00.000Z'),
  (4, 'PO-2026030022', NULL, 2, 'receive_completed', '2026-03-22T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2026-03-22T10:00:00.000Z', '2026-03-22T10:00:00.000Z'),
  (5, 'PO-2025050015', NULL, 1, 'receive_completed', '2025-05-15T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2025-05-15T10:00:00.000Z', '2025-05-15T10:00:00.000Z'),
  (6, 'PO-2025110002', NULL, 3, 'receive_completed', '2025-11-02T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2025-11-02T10:00:00.000Z', '2025-11-02T10:00:00.000Z'),
  (7, 'PO-2024030010', NULL, 2, 'receive_completed', '2024-03-10T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2024-03-10T10:00:00.000Z', '2024-03-10T10:00:00.000Z'),
  (8, 'PO-2024080020', NULL, 3, 'receive_completed', '2024-08-20T10:00:00.000Z', 'exclude', 7.00, 0, 0, 0, '', 1, 1, '2024-08-20T10:00:00.000Z', '2024-08-20T10:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  supplier_user_id = EXCLUDED.supplier_user_id,
  status = EXCLUDED.status,
  vat_type = EXCLUDED.vat_type,
  vat_rate = EXCLUDED.vat_rate,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('purchase_order', 'id'), GREATEST((SELECT MAX(id) FROM purchase_order), 1));

INSERT INTO purchase_order_item (
  id, purchase_order_id, status, type, product_item_id, identification_number,
  qty, free_gift, unit, price_per_unit, vat_rate, discount, total_price, note,
  created_by, updated_by, created_at, updated_at
)
VALUES
  (1, 1, 'receive_approved', 'catalog', 1, '', 48, 2, 'piece', 6.5, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 2, 'receive_approved', 'catalog', 1, '', 28, 2, 'piece', 6.0, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 2, 'receive_approved', 'catalog', 1, '', 18, 2, 'piece', 5.8, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 3, 'receive_approved', 'catalog', 1, '', 40, 3, 'piece', 6.2, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 3, 'receive_approved', 'catalog', 2, '', 20, 0, 'set', 12.0, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 4, 'receive_approved', 'catalog', 1, '', 30, 2, 'piece', 6.4, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 4, 'receive_approved', 'catalog', 2, '', 15, 1, 'set', 11.5, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 5, 'receive_approved', 'catalog', 1, '', 50, 5, 'piece', 6.0, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 6, 'receive_approved', 'catalog', 1, '', 25, 2, 'piece', 5.9, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 6, 'receive_approved', 'catalog', 2, '', 10, 0, 'set', 12.5, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, 7, 'receive_approved', 'catalog', 1, '', 60, 4, 'piece', 5.7, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 8, 'receive_approved', 'catalog', 2, '', 12, 1, 'set', 11.0, 7.00, 0, 0, '', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  purchase_order_id = EXCLUDED.purchase_order_id,
  product_item_id = EXCLUDED.product_item_id,
  status = EXCLUDED.status,
  qty = EXCLUDED.qty,
  free_gift = EXCLUDED.free_gift,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('purchase_order_item', 'id'), GREATEST((SELECT MAX(id) FROM purchase_order_item), 1));
