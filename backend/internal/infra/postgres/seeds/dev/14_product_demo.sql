-- Dev product demo — generated from design/js/seed/product_*.js
-- Requires: migrations 20260918140000_product_module.sql, warehouse dev seed (bins)

INSERT INTO product_attribute (id, type, type_car, system_file_id, parent_id, tree_path, sort_order, is_active, is_stopped, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 'brand', NULL, NULL, NULL, 'n1'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'brand', NULL, NULL, NULL, 'n2'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'category', NULL, NULL, NULL, 'n3'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'category', NULL, NULL, 3, 'n3.n4'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 'category', NULL, NULL, 4, 'n3.n4.n10'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, 'category', NULL, NULL, 10, 'n3.n4.n10.n11'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 'category', NULL, NULL, 3, 'n3.n12'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (13, 'category', NULL, NULL, 3, 'n3.n13'::ltree, 300, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (14, 'category', NULL, NULL, 12, 'n3.n12.n14'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (15, 'category', NULL, NULL, 4, 'n3.n4.n15'::ltree, 300, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (16, 'category', NULL, NULL, NULL, 'n16'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (17, 'category', NULL, NULL, 16, 'n16.n17'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (18, 'category', NULL, NULL, 16, 'n16.n18'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (19, 'category', NULL, NULL, 17, 'n16.n17.n19'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (20, 'category', NULL, NULL, 17, 'n16.n17.n20'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (21, 'category', NULL, NULL, NULL, 'n21'::ltree, 300, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (22, 'category', NULL, NULL, 21, 'n21.n22'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (23, 'category', NULL, NULL, 22, 'n21.n22.n23'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (24, 'category', NULL, NULL, 10, 'n3.n4.n10.n24'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'car', 'brand', NULL, NULL, 'n5'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'car', 'model', NULL, 5, 'n5.n6'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'car', 'engine', NULL, 6, 'n5.n6.n7'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'car', 'brand', NULL, NULL, 'n8'::ltree, 200, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 'car', 'model', NULL, 8, 'n8.n9'::ltree, 100, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  type_car = EXCLUDED.type_car,
  parent_id = EXCLUDED.parent_id,
  tree_path = EXCLUDED.tree_path,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_stopped = EXCLUDED.is_stopped,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_attribute_language (product_attribute_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'Toyota', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Toyota', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'Honda', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Honda', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'เครื่องยนต์', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Engine parts', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'น้ำมันเครื่อง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Engine oil', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 'th', 'Brakes', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 'en', 'Brakes', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, 'th', 'จานเบรก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, 'en', 'Brake discs', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 'th', 'กรอง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 'en', 'Filters', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (13, 'th', 'หัเทียน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (13, 'en', 'Spark plugs', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (14, 'th', 'กรองอากาศ', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (14, 'en', 'Air filters', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (15, 'th', 'น้ำมันเกียร์', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (15, 'en', 'Gear oil', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (16, 'th', 'อะไหล่ตัวถัง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (16, 'en', 'Body parts', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (17, 'th', 'กระจก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (17, 'en', 'Glass', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (18, 'th', 'กันชน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (18, 'en', 'Bumpers', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (19, 'th', 'กระจกหน้า', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (19, 'en', 'Windshield', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (20, 'th', 'กระจกมองข้าง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (20, 'en', 'Side mirrors', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (21, 'th', 'ระบบไฟฟ้า', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (21, 'en', 'Electrical', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (22, 'th', 'แบตเตอรี่', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (22, 'en', 'Battery', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (23, 'th', 'แบตเตอรี่รถยนต์', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (23, 'en', 'Automotive battery', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (24, 'th', 'ผ้าเบรก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (24, 'en', 'Brake pads', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'th', 'Toyota', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'en', 'Toyota', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'th', 'Camry', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'en', 'Camry', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'th', '2.0L', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'en', '2.0L', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'th', 'Honda', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'en', 'Honda', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 'th', 'Civic', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 'en', 'Civic', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (product_attribute_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_list (id, sku, product_brand_id, product_category_id, tag, supplier_sku, note, is_new, is_active, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 'P-LIST-001', 1, 3, 'OEM,ทดสอบ', 'SUP-001', '', TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'P-LIST-002', 2, 4, 'น้ำมัน', 'SUP-002', '', FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'P-LIST-003', 1, 3, '', '', 'Demo low stock', FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'P-LIST-004', 2, 3, 'promo', 'SUP-004', '', TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  product_brand_id = EXCLUDED.product_brand_id,
  product_category_id = EXCLUDED.product_category_id,
  tag = EXCLUDED.tag,
  supplier_sku = EXCLUDED.supplier_sku,
  note = EXCLUDED.note,
  is_new = EXCLUDED.is_new,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_list_language (product_list_id, locale, name, sub_name, created_at, updated_at)
VALUES
  (1, 'th', 'กรองน้ำมันเครื่อง', 'Toyota', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Engine oil filter', 'Toyota', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'น้ำมันเครื่องสังเคราะห์', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Synthetic engine oil', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'ผ้าเบรกหน้า', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Front brake pads', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'หัวเทียน', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Spark plugs', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (product_list_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  sub_name = EXCLUDED.sub_name,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item (id, product_list_id, sku, barcode, qrcode, price, price_wholesale, vat_rate, promotion, type_price, unit, qty_per_unit, weight, width, length, height, minimum_stock, is_stopped, is_fake, is_active, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 1, 'P-ITEM-001-A', '8851234567890', 'P-ITEM-001-A', 450, 400, 7, 'ส่วนลด 10% เดือนมีนาคม (ตัวอย่าง)', 'manual', 'piece', 1, 0.45, 10, 10, 15, 5, FALSE, FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 1, 'P-ITEM-001-B', NULL, NULL, 890, 0, 0, '', 'manual', 'set', 2, NULL, NULL, NULL, NULL, 3, FALSE, FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 2, 'P-ITEM-002-A', NULL, NULL, 1250.5, 0, 0, '', 'manual', 'liter', 4, NULL, NULL, NULL, NULL, 10, FALSE, FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 2, 'P-ITEM-002-B', NULL, NULL, 620, 0, 0, '', 'manual', 'piece', 1, NULL, NULL, NULL, NULL, 8, FALSE, FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 3, 'P-ITEM-003-A', NULL, NULL, 2100, 0, 0, '', 'manual', 'pair', 1, NULL, NULL, NULL, NULL, 20, FALSE, FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 3, 'P-ITEM-003-B', NULL, NULL, 1800, 0, 0, '', 'manual', 'pair', 1, NULL, NULL, NULL, NULL, 10000, FALSE, FALSE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 4, 'P-ITEM-004-A', NULL, NULL, 320, 0, 0, '', 'manual', 'piece', 4, NULL, NULL, NULL, NULL, 5, FALSE, FALSE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 4, 'P-ITEM-004-B', NULL, NULL, 280, 0, 0, '', 'manual', 'box', 10, NULL, NULL, NULL, NULL, 2, FALSE, FALSE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  product_list_id = EXCLUDED.product_list_id,
  sku = EXCLUDED.sku,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item_warehouse (id, product_item_id, bin_id, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 1, 22, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 2, 25, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 3, 28, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 4, 37, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 5, 31, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 6, 34, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 1, 35, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 1, 36, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  product_item_id = EXCLUDED.product_item_id,
  bin_id = EXCLUDED.bin_id,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item_stock (id, product_item_id, product_item_warehouse_id, purchase_order_item_id, order_quantity, order_free_gift, quantity, remain_quantity, cost_per_unit, discount_per_unit, sell_price, is_used, received_at, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 1, 1, 1, 48, 2, 50, 10, 6.5, 0.2, 10, TRUE, '2024-05-20T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 2, 2, NULL, 0, 0, 12, 12, 0, 0, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 3, 3, NULL, 0, 0, 7, 7, 0, 0, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 4, 4, NULL, 0, 0, 4, 4, 0, 0, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 5, 5, NULL, 0, 0, 18400, 18400, 0, 0, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 6, 6, NULL, 0, 0, 9200, 9200, 0, 0, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 1, 7, 2, 28, 2, 30, 5, 6, 0.15, 9.5, FALSE, '2024-06-15T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 1, 8, 3, 18, 2, 20, 0, 5.8, 0.1, 10.5, FALSE, '2024-08-01T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  remain_quantity = EXCLUDED.remain_quantity,
  is_used = EXCLUDED.is_used,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('product_attribute', 'id'), GREATEST((SELECT MAX(id) FROM product_attribute), 1));
SELECT setval(pg_get_serial_sequence('product_list', 'id'), GREATEST((SELECT MAX(id) FROM product_list), 1));
SELECT setval(pg_get_serial_sequence('product_item', 'id'), GREATEST((SELECT MAX(id) FROM product_item), 1));
SELECT setval(pg_get_serial_sequence('product_item_warehouse', 'id'), GREATEST((SELECT MAX(id) FROM product_item_warehouse), 1));
SELECT setval(pg_get_serial_sequence('product_item_stock', 'id'), GREATEST((SELECT MAX(id) FROM product_item_stock), 1));
