# Phase: Frontend — standalone purchase create

## Phase checklist

- [x] Route `/admin/order/purchase/new` mounts create shell (not the edit `PurchaseFormPage`)
- [x] Resizable left/right split (`ssr: false`) + co-located loading skeleton
- [x] Left: catalog browse (`StoreSalesProductBrowsePanel` resource=`purchases`) + custom stage (`TicketCustomStagePanel`)
- [x] Catalog add → consider topics (`compare_prices` / `select_partner`) → stock-history or supplier pick
- [x] Custom staged rows → supplier pick → draft card lines (`type: custom` + `system_file_ids`)
- [x] Right: multi-supplier draft cards; `createPurchase` without `purchase_request_id`; VAT from `fetchSettingVat` (fallback 7% / exclude)
- [x] After last card submit → redirect to `/admin/order/purchase`
- [x] th/en messages reuse `page.orderPurchase.form` / `receive` (+ ticket form stage copy)
- [x] Knowledge note in `document/knowledge/frontend.md`

## Required checklist

- [x] Edit of `draft` / `rejected` stays on `PurchaseFormPage` via `/[id]`
- [x] Dates via shared helpers where shown; create uses setting VAT for money summary
- [x] Supplier pick via purchase `/filters?facet=suppliers` (page RBAC)
- [x] Product browse / car facets via `GET /order/purchases/items` + `/filters`
- [ ] Manual smoke: browse → consider → assign partner → save draft / create pending → list
