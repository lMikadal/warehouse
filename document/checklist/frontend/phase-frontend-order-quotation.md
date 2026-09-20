# Phase: Frontend — order quotation

## Phase checklist

- [x] Routes `/admin/sales/quotation`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/payment` + `loading.tsx`
- [x] List: search, date range, seller filter, status/overdue pills, fulfill column, receipt lock on actions
- [x] Form: store browse table (no compare), `quotation-document-panel`
- [x] Detail: superadmin approval footer, accept/picking modals, duplicate flow
- [x] BFF `/api/v1/auth/proxy/order/quotations/*`, `order-quotation-api.ts`
- [x] i18n `page-order-quotation.json` (th/en)

## Required checklist

- [x] `useResourcePermissions("order", "order_quotation")`
- [ ] Payment page: multi-method + credit approver PIN parity with design (v1 simplified)
- [ ] Manual th locale smoke
