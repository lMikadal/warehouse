# Phase: Frontend — order quotation

## Phase checklist

- [x] Routes `/admin/sales/quotation`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/payment` + `loading.tsx`
- [x] List: search, date range, seller filter, status/overdue pills, fulfill column, receipt lock on actions
- [x] Form: store customer step + product browse/filters (no compare); `quotation-document-panel` (issue/valid-until, reserve, notes only when cart has lines; items cart + price summary; draft edit shows latest return note banner from `latest_reject`)
- [x] Detail: draft → form; non-draft → split (customer + items/summary left | meta right); fixed footer by role (pending: staff/seller Print+Accept **always disabled** until superadmin approves | superadmin reject/return dialog/inline edit+save/approve; **approved**: seller Print+Accept when create/update; **success**: Print + Accept (primary) when no `accept_mode` (seller or superadmin) — no order-picking footer button in UI); accept: choose dialog → payment/credit **right panel** (UI only; API accept deferred)
- [x] BFF `/api/v1/auth/proxy/order/quotations/*`, `order-quotation-api.ts`
- [x] i18n `page-order-quotation.json` (th/en)

## Required checklist

- [x] `useResourcePermissions("order", "order_quotation")`
- [ ] Payment page: multi-method + credit approver PIN parity with design (v1 simplified)
- [ ] Manual th locale smoke
