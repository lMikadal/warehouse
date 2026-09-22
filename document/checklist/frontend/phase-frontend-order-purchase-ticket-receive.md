# Phase: Frontend — purchase ticket receive

## Phase checklist

- [x] Route `/admin/order/purchase/ticket/[id]` mounts receive form (not sales TicketFormPage)
- [x] Resizable left/right split (`ssr: false`) + co-located loading skeleton
- [x] Left panel: ticket header, catalog/custom tabs, พิจารณา, inline history
- [x] Consider topics: compare prices, select partner, change brand, wait, cancel, stop
- [x] Right rail: existing POs + draft partner cards + empty state
- [x] Create PO from draft via `createPurchase` + `purchase_request_id` / item ids
- [x] th/en `page.orderPurchase.receive` messages
- [x] Knowledge note in `document/knowledge/frontend.md`

## Required checklist

- [x] Keep `/ticket/new` as create form; `/ticket/[id]/detail` as read-only detail
- [x] Dates via `formatDateTime` / `formatDate`
- [x] Supplier pick via purchase `/filters?facet=suppliers` (page RBAC)
- [ ] Manual smoke: open pending ticket → consider → assign partner → create PO → empty state / redirect
