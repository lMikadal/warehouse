-- Dev supplier demo — mirrors design/js/seed/supplier_*.js
-- Requires: migration 20260917100000_supplier_module.sql, init geo, dev 10_setting_catalog.sql

INSERT INTO supplier_user (id, sku, credit_term, credit_term_note, is_active, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'SUP001', 30, 'ชำระภายใน 30 วันหลังรับใบแจ้งหนี้', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 'SUP002', 15, '', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (3, 'SUP003', NULL, 'เงินสด', true, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (4, 'SUP004', 45, '', false, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET
  sku = EXCLUDED.sku,
  credit_term = EXCLUDED.credit_term,
  credit_term_note = EXCLUDED.credit_term_note,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at,
  updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('supplier_user', 'id'), GREATEST((SELECT MAX(id) FROM supplier_user), 1));

INSERT INTO supplier_information (
  supplier_user_id, type, setting_prefix_id, name, branch, branch_name, tax_number, address,
  website_province_id, website_district_id, website_sub_district_id, postcode, tel, email, is_same_information
)
VALUES
  (1, 'contact', 4, 'อะไหล่รถยนต์ไทย', 'headquarter', NULL, '0105551234567', '123 ถนนพระราม 4 แขวงปทุมวัน', 1, 1, 1, '10200', '02-1234567', 'info@thai-auto.test', false),
  (1, 'tax_invoice', 4, 'อะไหล่รถยนต์ไทย', 'headquarter', NULL, '0105551234567', '123 ถนนพระราม 4 แขวงปทุมวัน', 1, 1, 1, '10200', '02-1234567', 'info@thai-auto.test', true),
  (1, 'delivery', NULL, 'ฝ่ายจัดส่ง อะไหล่รถยนต์ไทย', NULL, NULL, NULL, '123 ถนนพระราม 4 แขวงปทุมวัน', 1, 1, 1, '10200', '02-1234568', NULL, false),
  (2, 'contact', 5, 'เชียงใหม่ ออโต้ พาร์ท', 'headquarter', NULL, '0105567890123', '88 ถนนมหิดล ตำบลสุเทพ', 9, 7, 13, '50200', '053-111222', 'sales@cm-auto.test', false),
  (2, 'tax_invoice', 5, 'เชียงใหม่ ออโต้ พาร์ท', 'headquarter', NULL, '0105567890123', '88 ถนนมหิดล ตำบลสุเทพ', 9, 7, 13, '50200', '053-111222', 'sales@cm-auto.test', true),
  (2, 'delivery', NULL, 'คุณสมศักดิ์ รับของ', NULL, NULL, NULL, '88 ถนนมหิดล ตำบลสุเทพ', 9, 7, 13, '50200', '081-2345678', NULL, false),
  (3, 'contact', 7, 'สมชาย อะไหล่รถ', NULL, NULL, '1234567890123', '45/1 ถ. อโศก', 1, 2, 3, '10500', '089-8887777', 'somchai@parts.test', false),
  (3, 'tax_invoice', 7, 'สมชาย อะไหล่รถ', NULL, NULL, '1234567890123', '45/1 ถ. อโศก', 1, 2, 3, '10500', '089-8887777', 'somchai@parts.test', true),
  (3, 'delivery', NULL, 'สมชาย อะไหล่รถ', NULL, NULL, NULL, '45/1 ถ. อโศก', 1, 2, 3, '10500', '089-8887777', NULL, false),
  (4, 'contact', 6, 'ห้างหุ้นส่วนจำกัด ภูเก็ต มอเตอร์', 'branch', 'สาขาภูเก็ต', '0105576543210', '12 ถนนรัษฎา', 11, 10, 19, '83000', '076-555666', 'contact@phuket-motor.test', false),
  (4, 'tax_invoice', 6, 'ห้างหุ้นส่วนจำกัด ภูเก็ต มอเตอร์', 'branch', 'สาขาภูเก็ต', '0105576543210', '12 ถนนรัษฎา', 11, 10, 19, '83000', '076-555666', 'contact@phuket-motor.test', false),
  (4, 'delivery', NULL, 'ฝ่ายคลัง ภูเก็ต มอเตอร์', NULL, NULL, NULL, '12 ถนนรัษฎา', 11, 10, 19, '83000', '076-555667', NULL, false)
ON CONFLICT (supplier_user_id, type) DO UPDATE SET
  setting_prefix_id = EXCLUDED.setting_prefix_id,
  name = EXCLUDED.name,
  branch = EXCLUDED.branch,
  branch_name = EXCLUDED.branch_name,
  tax_number = EXCLUDED.tax_number,
  address = EXCLUDED.address,
  website_province_id = EXCLUDED.website_province_id,
  website_district_id = EXCLUDED.website_district_id,
  website_sub_district_id = EXCLUDED.website_sub_district_id,
  postcode = EXCLUDED.postcode,
  tel = EXCLUDED.tel,
  email = EXCLUDED.email,
  is_same_information = EXCLUDED.is_same_information;

INSERT INTO supplier_contact (id, supplier_user_id, name, email, tel, position, sort_order, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 1, 'สมชาย ใจดี', 'somchai@thai-auto.test', '081-1112222', 'ฝ่ายขาย', 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 1, 'วิไล รักษ์ดี', 'wilai@thai-auto.test', '082-3334444', 'ฝ่ายจัดซื้อ', 200, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (3, 2, 'ประเสริฐ มั่นคง', 'prasert@cm-auto.test', '086-5556666', 'ผู้จัดการ', 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (4, 3, 'สมชาย อะไหล่รถ', 'somchai@parts.test', '089-8887777', NULL, 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET
  supplier_user_id = EXCLUDED.supplier_user_id,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  tel = EXCLUDED.tel,
  position = EXCLUDED.position,
  sort_order = EXCLUDED.sort_order,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at,
  updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('supplier_contact', 'id'), GREATEST((SELECT MAX(id) FROM supplier_contact), 1));

INSERT INTO supplier_bank (id, supplier_user_id, setting_bank_id, name, number, branch, is_active, is_default, sort_order, deleted_at, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 1, 1, 'บริษัท อะไหล่รถยนต์ไทย จำกัด', '1234567890', 'สาขาสีลม', true, true, 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (2, 1, 2, 'บริษัท อะไหล่รถยนต์ไทย จำกัด', '9876543210', 'สาขารามคำแหง', true, false, 200, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (3, 2, 3, 'เชียงใหม่ ออโต้ พาร์ท จำกัด (มหาชน)', '5555666677', 'สาขาเชียงใหม่', true, true, 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1),
  (4, 4, 4, 'ห้างหุ้นส่วนจำกัด ภูเก็ต มอเตอร์', '1122334455', NULL, false, true, 100, NULL, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 1, 1)
ON CONFLICT (id) DO UPDATE SET
  supplier_user_id = EXCLUDED.supplier_user_id,
  setting_bank_id = EXCLUDED.setting_bank_id,
  name = EXCLUDED.name,
  number = EXCLUDED.number,
  branch = EXCLUDED.branch,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  sort_order = EXCLUDED.sort_order,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at,
  updated_by = EXCLUDED.updated_by;

SELECT setval(pg_get_serial_sequence('supplier_bank', 'id'), GREATEST((SELECT MAX(id) FROM supplier_bank), 1));

-- staff role (id 2): supplier CRUD for local smoke tests
INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 2, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code IN (
    'supplier.supplier_user.view',
    'supplier.supplier_user.create',
    'supplier.supplier_user.update',
    'supplier.supplier_user.delete'
  )
ON CONFLICT DO NOTHING;
