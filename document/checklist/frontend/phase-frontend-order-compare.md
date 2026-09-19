# Phase: Order compare (special price UI)

## Phase checklist

- [x] Route `/admin/order/compare` + `loading.tsx`
- [x] `_shared/order-compare-page.tsx` (tree, dialog, footer save, import/export JSON)
- [x] BFF `lib/bff-order-compare-handlers.ts` + proxy routes
- [x] Client `lib/order-compare-api.ts`
- [x] i18n `page-order-compare.json` (th/en)

## Required checklist

- [x] `useResourcePermissions("order", "order_compare")`
- [x] Brand pagination + search
- [x] Dialog batch fill (apply all) + draft until footer save
- [ ] Manual smoke with locale `th` (no `MISSING_MESSAGE`)
