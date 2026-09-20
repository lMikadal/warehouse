# Phase: Backend — order quotation

## Phase checklist

- [x] `design/schema/order_quotation*.sql` + goose migration + `order_list` / `order_payment`.`order_quotation_id`
- [x] `system_code_prefix` `order_quotation` / `QT`
- [x] `quotation_types.go`, `quotation_repository.go`, `quotation_handler.go`, `/api/v1/order/quotations`
- [x] Status machine, payment, picking, fulfill-check/fulfill (shipping + payment + payment_item; sell-price compare; `only_in_stock` → child QT success + docs), duplicate (+ reprice via sell price), receipt lock
- [x] `perm_catalog` + seed ids 229–234, menu id 58
- [x] `make backend-test`

## Required checklist

- [x] Superadmin-only approve/reject/return enforced in handler
- [x] `order_quotation_attachment` file purpose
- [ ] Manual smoke: accept credit requires `credit_date`
