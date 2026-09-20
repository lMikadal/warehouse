-- Link menu 58 (quotation) to order_quotation permission catalog (229–234).
INSERT INTO system_menu_permission (system_menu_id, system_permission_id)
VALUES
  (58, 229),
  (58, 230),
  (58, 231),
  (58, 232),
  (58, 233),
  (58, 234)
ON CONFLICT DO NOTHING;
