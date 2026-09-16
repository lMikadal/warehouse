-- Dev re-run of setting catalog (keep in sync with init/09_setting_catalog.sql).
-- Requires: 01_system_language.sql, migration 20260317110000_setting_module.sql.

-- setting_code
INSERT INTO setting_code (id, code, value, sort_order, is_active, deleted_at, created_at, updated_at)
VALUES
  (1, 'A', '1', 100, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'B', '2', 200, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'C', '3', 300, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  value = EXCLUDED.value,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_code', 'id'), GREATEST((SELECT MAX(id) FROM setting_code), 1));

-- setting_bank
INSERT INTO setting_bank (id, system_file_id, sort_order, is_active, deleted_at, created_at, updated_at)
VALUES
  (1, NULL, 100, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, NULL, 200, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, NULL, 300, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, NULL, 400, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  system_file_id = EXCLUDED.system_file_id,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_bank', 'id'), GREATEST((SELECT MAX(id) FROM setting_bank), 1));

INSERT INTO setting_bank_language (setting_bank_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'ธนาคารกสิกรไทย', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Kasikorn Bank', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'ธนาคารไทยพาณิชย์', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Siam Commercial Bank', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'ธนาคารกรุงเทพ', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Bangkok Bank', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'ธนาคารกรุงไทย', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Krung Thai Bank', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (setting_bank_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- setting_payment_method
INSERT INTO setting_payment_method (id, is_sale, is_purchase, sort_order, is_active, deleted_at, created_at, updated_at)
VALUES
  (1, true, true, 100, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, true, true, 200, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, true, true, 300, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, true, false, 400, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, false, true, 500, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, false, true, 600, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  is_sale = EXCLUDED.is_sale,
  is_purchase = EXCLUDED.is_purchase,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_payment_method', 'id'), GREATEST((SELECT MAX(id) FROM setting_payment_method), 1));

INSERT INTO setting_payment_method_language (setting_payment_method_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'เงินสด', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Cash', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'QR Code', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'QR Code', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'โอนเงิน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Bank Transfer', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'บัตรเครดิต/เดบิต', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Credit/Debit Card', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'th', 'เช็คเงินสด', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'en', 'Cash Cheque', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'th', 'เครดิตเทอม', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'en', 'Credit Term', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (setting_payment_method_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- setting_claim_reason
INSERT INTO setting_claim_reason (id, is_claim, is_return, sort_order, is_active, deleted_at, created_at, updated_at)
VALUES
  (1, true, false, 100, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, true, false, 200, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, false, true, 300, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, true, true, 400, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  is_claim = EXCLUDED.is_claim,
  is_return = EXCLUDED.is_return,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_claim_reason', 'id'), GREATEST((SELECT MAX(id) FROM setting_claim_reason), 1));

INSERT INTO setting_claim_reason_language (setting_claim_reason_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'สินค้าเสียหาย', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Damaged product', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'สินค้าไม่ตรงตามที่สั่ง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Wrong item', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'เปลี่ยนใจ', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Changed mind', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'ไม่ได้ใช้งาน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Unused', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (setting_claim_reason_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- setting_prefix
INSERT INTO setting_prefix (id, is_person, is_company, sort_order, is_active, deleted_at, created_at, updated_at)
VALUES
  (1, true, false, 100, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, true, false, 200, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, true, false, 300, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, false, true, 100, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, false, true, 200, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, false, true, 300, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, false, true, 400, true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  is_person = EXCLUDED.is_person,
  is_company = EXCLUDED.is_company,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_prefix', 'id'), GREATEST((SELECT MAX(id) FROM setting_prefix), 1));

INSERT INTO setting_prefix_language (setting_prefix_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'นาย', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Mr.', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'นาง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Mrs.', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'นางสาว', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Miss', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'บริษัท จำกัด', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Co., Ltd.', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'th', 'บริษัทมหาชน จำกัด', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'en', 'Public Co., Ltd.', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'th', 'ห้างหุ้นส่วนจำกัด', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'en', 'Limited Partnership', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'th', 'บุคคลธรรมดา', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'en', 'Individual', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (setting_prefix_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- setting_sale_channel
INSERT INTO setting_sale_channel (
  id, system_file_id, is_active, is_default, member_setting_relation_id, sort_order,
  deleted_at, created_at, updated_at
)
VALUES
  (1, NULL, true, true, NULL, 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, NULL, true, true, NULL, 200, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, NULL, true, true, NULL, 300, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, NULL, true, false, NULL, 400, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, NULL, true, false, NULL, 500, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, NULL, true, true, 1, 600, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, NULL, true, true, 2, 700, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, NULL, true, true, 3, 800, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, NULL, true, true, 4, 900, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, NULL, true, true, 5, 1000, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, NULL, true, true, 6, 1100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, NULL, true, true, 7, 1200, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (13, NULL, true, true, 8, 1300, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  system_file_id = EXCLUDED.system_file_id,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  member_setting_relation_id = EXCLUDED.member_setting_relation_id,
  sort_order = EXCLUDED.sort_order,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_sale_channel', 'id'), GREATEST((SELECT MAX(id) FROM setting_sale_channel), 1));

INSERT INTO setting_sale_channel_language (setting_sale_channel_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'เว็บไซต์', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Website', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'Shopee', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Shopee', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'Lazada', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Lazada', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'th', 'Facebook', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'en', 'Facebook', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'th', 'หน้าร้าน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'en', 'Walk-in', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'th', 'อู่ · เงินสด · ราคาปลีก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'en', 'Garage · Cash · Retail', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'th', 'อู่ · เงินสด · ราคาส่ง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'en', 'Garage · Cash · Wholesale', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'th', 'อู่ · เงินเชื่อ · ราคาปลีก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'en', 'Garage · Credit · Retail', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 'th', 'อู่ · เงินเชื่อ · ราคาส่ง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (9, 'en', 'Garage · Credit · Wholesale', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 'th', 'ลูกค้าทั่วไป · เงินสด · ราคาปลีก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (10, 'en', 'General customer · Cash · Retail', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, 'th', 'ลูกค้าทั่วไป · เงินสด · ราคาส่ง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (11, 'en', 'General customer · Cash · Wholesale', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 'th', 'ลูกค้าทั่วไป · เงินเชื่อ · ราคาปลีก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (12, 'en', 'General customer · Credit · Retail', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (13, 'th', 'ลูกค้าทั่วไป · เงินเชื่อ · ราคาส่ง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (13, 'en', 'General customer · Credit · Wholesale', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (setting_sale_channel_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;
