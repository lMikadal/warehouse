# Phase: Frontend — order sales claim (supplier flow)

## Phase checklist

- [x] API client: `patchSalesClaim`, `fetchSalesClaimSupplierOptions`, extended `SalesClaimDetail`
- [x] BFF handlers + routes: `PATCH /sales-claims/:id`, `GET /sales-claims/filters`
- [x] Supplier picker dialog `sales-claim-supplier-dialog.tsx` (name / address / tel, debounced search)
- [x] Supplier document panel `sales-claim-supplier-panel.tsx` (save draft / send)
- [x] Process view: header info grid, item columns, per-phase line actions, reject + supplier-response dialogs, supplier message banner, confirm-send dialog
- [x] Print button on the detail header when the claim is closed
- [x] Six-step timeline in `sales-claim-workflow.ts` + workflow test
- [x] th/en i18n keys + `check-i18n-keys`

## Required checklist

- [x] `readOnly` still hides every control (store-desk twin inherits the layout)
- [x] Forms rule: search input uses `search.placeholder`; textarea has a placeholder
- [ ] Manual smoke: pending → assign supplier → save draft (reload keeps note) → send → review each line → close → print
