-- Dev member demo — mirrors design/js/seed/member_*.js
-- Requires: 20260919100000_member_module.sql, init geo, dev 10_setting_catalog.sql, dev 14_product_demo.sql

INSERT INTO member_setting_credit (id, sku, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'CASH', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 'CREDIT', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, is_active = EXCLUDED.is_active, deleted_at = NULL, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
SELECT setval(pg_get_serial_sequence('member_setting_credit', 'id'), GREATEST((SELECT MAX(id) FROM member_setting_credit), 1));

INSERT INTO member_setting_credit_language (member_setting_credit_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'เงินสด', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Cash', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'เงินเชื่อ', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Credit', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (member_setting_credit_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at;

INSERT INTO member_setting_group (id, sku, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'RETAIL', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 'WHOLESALE', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, is_active = EXCLUDED.is_active, deleted_at = NULL, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
SELECT setval(pg_get_serial_sequence('member_setting_group', 'id'), GREATEST((SELECT MAX(id) FROM member_setting_group), 1));

INSERT INTO member_setting_group_language (member_setting_group_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'ราคาปลีก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Retail', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'ราคาส่ง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Wholesale', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (member_setting_group_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at;

INSERT INTO member_setting_business (id, sku, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'U01', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 'A01', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, is_active = EXCLUDED.is_active, deleted_at = NULL, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
SELECT setval(pg_get_serial_sequence('member_setting_business', 'id'), GREATEST((SELECT MAX(id) FROM member_setting_business), 1));

INSERT INTO member_setting_business_language (member_setting_business_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'อู่', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Garage', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'ร้านค้า', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Shop', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (member_setting_business_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at;

INSERT INTO member_setting_relation (id, credit_id, group_id, business_id, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 1, 1, 1, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 1, 2, 1, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (3, 2, 1, 1, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (4, 2, 2, 1, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (5, 1, 1, 2, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (6, 1, 2, 2, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (7, 2, 1, 2, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (8, 2, 2, 2, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET credit_id = EXCLUDED.credit_id, group_id = EXCLUDED.group_id, business_id = EXCLUDED.business_id,
  is_active = EXCLUDED.is_active, deleted_at = NULL, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
SELECT setval(pg_get_serial_sequence('member_setting_relation', 'id'), GREATEST((SELECT MAX(id) FROM member_setting_relation), 1));

UPDATE setting_sale_channel SET member_setting_relation_id = v.rel
FROM (VALUES (6, 1), (7, 2), (8, 3), (9, 4), (10, 5), (11, 6), (12, 7), (13, 8)) AS v(id, rel)
WHERE setting_sale_channel.id = v.id;

INSERT INTO member_tier (id, system_file_id, parent_id, tree_path, sort_order, is_default, is_active, purchase_start, purchase_end, discount, discount_type, type, is_promotion, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, NULL, NULL, 'n1'::ltree, 100, true, true, 0, 9999, 0, 'percent', 'all', false, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, NULL, NULL, 'n2'::ltree, 200, false, true, 10000, 49999, 5, 'percent', 'all', false, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (3, NULL, NULL, 'n3'::ltree, 300, false, true, 50000, 99999, 10, 'percent', 'all', false, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (4, NULL, NULL, 'n4'::ltree, 400, false, true, 100000, 9999999, 15, 'percent', 'brand', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET parent_id = EXCLUDED.parent_id, tree_path = EXCLUDED.tree_path, sort_order = EXCLUDED.sort_order,
  is_default = EXCLUDED.is_default, is_active = EXCLUDED.is_active, purchase_start = EXCLUDED.purchase_start, purchase_end = EXCLUDED.purchase_end,
  discount = EXCLUDED.discount, discount_type = EXCLUDED.discount_type, type = EXCLUDED.type, is_promotion = EXCLUDED.is_promotion,
  deleted_at = NULL, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
SELECT setval(pg_get_serial_sequence('member_tier', 'id'), GREATEST((SELECT MAX(id) FROM member_tier), 1));

INSERT INTO member_tier_language (member_tier_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'ทั่วไป', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'General', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'เงิน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Silver', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'ทอง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Gold', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'VIP', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'VIP', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (member_tier_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at;

INSERT INTO member_user (id, sku, member_tier_id, type, setting_prefix_id, name, store_name, tax_number, branch, branch_name, tel, email, address,
  website_province_id, website_district_id, website_sub_district_id, postcode, system_file_id, note, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'MEM-001', 1, 'person', 1, 'สมชาย ใจดี', 'อู่สมชาย', '1234567890123', NULL, NULL, '081-2345678', 'somchai@example.com', '123 ถนนเจริญกรุง', 1, 1, 1, '10200', NULL, 'ลูกค้าประจำอู่', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 'MEM-002', 2, 'company', 4, 'อู่เจริญยนต์ จำกัด', 'เจริญยนต์', '0105551234567', 'headquarter', NULL, '02-1234567', 'info@charoenyon.co.th', '88/9 ถนนพระราม 4', 1, 2, 3, '10500', NULL, 'สั่งซื้อเป็นชุด', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (3, 'MEM-003', 1, 'person', 3, 'พิมพ์ รักดี', NULL, NULL, NULL, NULL, '089-1112233', 'pim@example.com', '15 ซอยสุขุมวิท 21', 1, 3, 5, '10300', NULL, NULL, false, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, member_tier_id = EXCLUDED.member_tier_id, type = EXCLUDED.type, setting_prefix_id = EXCLUDED.setting_prefix_id,
  name = EXCLUDED.name, store_name = EXCLUDED.store_name, tax_number = EXCLUDED.tax_number, branch = EXCLUDED.branch, branch_name = EXCLUDED.branch_name,
  tel = EXCLUDED.tel, email = EXCLUDED.email, address = EXCLUDED.address, website_province_id = EXCLUDED.website_province_id,
  website_district_id = EXCLUDED.website_district_id, website_sub_district_id = EXCLUDED.website_sub_district_id, postcode = EXCLUDED.postcode,
  note = EXCLUDED.note, is_active = EXCLUDED.is_active, deleted_at = NULL, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
SELECT setval(pg_get_serial_sequence('member_user', 'id'), GREATEST((SELECT MAX(id) FROM member_user), 1));

INSERT INTO member_user_setting (member_user_id, member_setting_relation_id)
VALUES (1, 1), (2, 4), (3, 5)
ON CONFLICT DO NOTHING;

INSERT INTO member_user_owner (member_user_id, admin_user_id)
VALUES (1, 1), (2, 1)
ON CONFLICT DO NOTHING;
