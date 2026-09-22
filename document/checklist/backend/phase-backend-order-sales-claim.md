# Phase: Backend — order sales claim (supplier flow)

## Phase checklist

- [x] Migration `20260922220000_order_claim_note_supplier.sql` (`order_claim.note_supplier`) + mirror in `design/schema/order_claim.sql`
- [x] `GET /api/v1/order/sales-claims/:id` returns `note_supplier`, supplier snapshot (name/address/tel), `order_created_at`, `delivery_at`
- [x] `PATCH /api/v1/order/sales-claims/:id` (supplier_user_id / note_supplier), pending/acknowledged only, active supplier required
- [x] `PATCH /:id/status → waiting_supplier` guarded by `supplier_user_id IS NOT NULL`
- [x] `GET /api/v1/order/sales-claims/filters?facet=suppliers`
- [x] Product supplier filters return `address` + `tel`
- [x] `go build` + `go test ./internal/module/order/...`
- [x] Postman **Order → Sales claims** entries

## Required checklist

- [x] RBAC reuse (`order.order_sales_claim.view` / `.update`) — no new seeds
- [x] No new claim status enum values (pending → acknowledged → waiting_supplier → success)
- [ ] Manual smoke: assign supplier → save draft → send (waiting_supplier) → review lines → close
