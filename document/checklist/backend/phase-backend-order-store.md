# Phase: Backend — order store (store sales)

## Phase checklist

- [x] Design schema `order_list*` + related payment/claim/shipping FK renames
- [x] Goose migration `20260920120000_order_list_module.sql`
- [x] `GET/POST/PATCH/DELETE /api/v1/order/store-sales` + count, filters, status
- [x] Drop `order_list_print_log` (`20260920130000_drop_order_list_print_log.sql`)
- [x] `member_history` when picking doc created (`pending`; create or draft→pending)
- [x] RBAC `order.order_store.*` route tests extended
- [ ] Postman collection entries (see `document/postman/postman.json`)

## Required checklist

- [x] `system_code_prefix.code_key` = `order_list` (PJB)
- [x] Dev seed `16_order_list_demo.sql` (optional local data)
- [ ] Manual smoke: list totals from `order_list_item` → create draft → pending → `member_history` row
