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

INSERT INTO product_list (id, sku, product_brand_id, product_category_id, tag, supplier_sku, note, is_active, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 'P-LIST-001', 1, 3, 'OEM,ทดสอบ', 'SUP-001', '', TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'P-LIST-002', 2, 4, 'น้ำมัน', 'SUP-002', '', TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'P-LIST-003', 1, 3, '', '', 'Demo low stock', TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'P-LIST-004', 2, 3, 'promo', 'SUP-004', '', FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  product_brand_id = EXCLUDED.product_brand_id,
  product_category_id = EXCLUDED.product_category_id,
  tag = EXCLUDED.tag,
  supplier_sku = EXCLUDED.supplier_sku,
  note = EXCLUDED.note,
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

INSERT INTO product_list_supplier (product_list_id, supplier_user_id)
VALUES
  (1, 1),
  (1, 2),
  (2, 2),
  (2, 3),
  (3, 1),
  (4, 4)
ON CONFLICT (product_list_id, supplier_user_id) DO NOTHING;

INSERT INTO product_list_car (id, product_list_id, product_attribute_brand_id, product_attribute_model_id, product_attribute_engine_id, gear_type, year_start, year_end, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 1, 5, 6, 7, 'auto', 2018, 2022, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 1, 8, 9, 7, 'manual', 2016, 2020, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 2, 5, 6, 7, 'auto', 2019, 2023, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  product_list_id = EXCLUDED.product_list_id,
  product_attribute_brand_id = EXCLUDED.product_attribute_brand_id,
  product_attribute_model_id = EXCLUDED.product_attribute_model_id,
  product_attribute_engine_id = EXCLUDED.product_attribute_engine_id,
  gear_type = EXCLUDED.gear_type,
  year_start = EXCLUDED.year_start,
  year_end = EXCLUDED.year_end,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO product_item (id, product_list_id, sku, barcode, qrcode, price, price_wholesale, price_vat, price_wholesale_vat, vat_type, vat_rate, promotion, type_price, unit, qty_per_unit, weight, width, length, height, minimum_stock, is_new, is_stopped, is_authentic, is_active, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 1, 'P-ITEM-001-A', '8851234567890', 'P-ITEM-001-A', 450, 400, 481.5, 428, 'include', 7, 'ส่วนลด 10% เดือนมีนาคม (ตัวอย่าง)', 'manual', 'piece', 1, 0.45, 10, 10, 15, 5, TRUE, FALSE, TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 1, 'P-ITEM-001-B', NULL, NULL, 890, 0, 890, 0, 'exclude', 0, '', 'manual', 'set', 2, NULL, NULL, NULL, NULL, 3, TRUE, FALSE, TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 2, 'P-ITEM-002-A', NULL, NULL, 1250.5, 0, 1250.5, 0, 'exclude', 0, '', 'manual', 'liter', 4, NULL, NULL, NULL, NULL, 10, FALSE, FALSE, TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 2, 'P-ITEM-002-B', NULL, NULL, 620, 0, 620, 0, 'exclude', 0, '', 'manual', 'piece', 1, NULL, NULL, NULL, NULL, 8, FALSE, FALSE, TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 3, 'P-ITEM-003-A', NULL, NULL, 2100, 0, 2100, 0, 'exclude', 0, '', 'manual', 'pair', 1, NULL, NULL, NULL, NULL, 20, FALSE, FALSE, TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 3, 'P-ITEM-003-B', NULL, NULL, 1800, 0, 1800, 0, 'exclude', 0, '', 'manual', 'pair', 1, NULL, NULL, NULL, NULL, 10000, FALSE, FALSE, TRUE, TRUE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 4, 'P-ITEM-004-A', NULL, NULL, 320, 0, 320, 0, 'exclude', 0, '', 'manual', 'piece', 4, NULL, NULL, NULL, NULL, 5, TRUE, FALSE, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 4, 'P-ITEM-004-B', NULL, NULL, 280, 0, 280, 0, 'exclude', 0, '', 'manual', 'box', 10, NULL, NULL, NULL, NULL, 2, TRUE, FALSE, TRUE, FALSE, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  product_list_id = EXCLUDED.product_list_id,
  sku = EXCLUDED.sku,
  price = EXCLUDED.price,
  is_new = EXCLUDED.is_new,
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

-- purchase_order demo (after product_item; before product_item_stock FK — see also 14_purchase_order_demo.sql)
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

INSERT INTO product_item_stock (id, product_item_id, product_item_warehouse_id, purchase_order_item_id, supplier_user_id, order_quantity, order_free_gift, quantity, remain_quantity, cost_per_unit, discount_per_unit, vat_type, vat_rate, sell_price, is_used, received_at, created_by, updated_by, created_at, updated_at)
VALUES
  (1, 1, 1, 1, NULL, 48, 2, 50, 10, 6.5, 0.2, 'exclude', 7.00, 10, TRUE, '2024-05-20T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 2, 2, NULL, 1, 0, 0, 12, 12, 10, 0, 'exclude', 7.00, 20, TRUE, '2024-06-01T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 3, 3, 5, NULL, 20, 0, 7, 7, 12, 0, 'exclude', 7.00, 0, TRUE, '2024-07-10T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 4, 4, NULL, NULL, 0, 0, 4, 4, 0, 0, 'exclude', 7.00, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 5, 5, NULL, NULL, 0, 0, 18400, 18400, 0, 0, 'exclude', 7.00, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 6, 6, NULL, NULL, 0, 0, 9200, 9200, 0, 0, 'exclude', 7.00, 0, TRUE, NULL, 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 1, 7, 2, NULL, 28, 2, 30, 5, 6, 0.15, 'exclude', 7.00, 9.5, FALSE, '2024-06-15T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 1, 8, 3, NULL, 18, 2, 20, 0, 5.8, 0.1, 'exclude', 7.00, 10.5, FALSE, '2024-08-01T10:00:00.000Z', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  purchase_order_item_id = EXCLUDED.purchase_order_item_id,
  supplier_user_id = EXCLUDED.supplier_user_id,
  remain_quantity = EXCLUDED.remain_quantity,
  cost_per_unit = EXCLUDED.cost_per_unit,
  sell_price = EXCLUDED.sell_price,
  received_at = EXCLUDED.received_at,
  vat_type = EXCLUDED.vat_type,
  vat_rate = EXCLUDED.vat_rate,
  is_used = EXCLUDED.is_used,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('product_attribute', 'id'), GREATEST((SELECT MAX(id) FROM product_attribute), 1));
SELECT setval(pg_get_serial_sequence('product_list', 'id'), GREATEST((SELECT MAX(id) FROM product_list), 1));
SELECT setval(pg_get_serial_sequence('product_list_car', 'id'), GREATEST((SELECT MAX(id) FROM product_list_car), 1));
SELECT setval(pg_get_serial_sequence('product_item', 'id'), GREATEST((SELECT MAX(id) FROM product_item), 1));
SELECT setval(pg_get_serial_sequence('product_item_warehouse', 'id'), GREATEST((SELECT MAX(id) FROM product_item_warehouse), 1));
SELECT setval(pg_get_serial_sequence('product_item_stock', 'id'), GREATEST((SELECT MAX(id) FROM product_item_stock), 1));
