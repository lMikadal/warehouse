# Phase: Frontend — order store (store sales)

## Phase checklist

- [x] Routes `/admin/sales/store`, `/new`, `/[id]` + `loading.tsx`
- [x] List: toolbar, status tabs, family expand, pagination, TableIconActions (draft: edit+delete; pending: view+delete; else view)
- [x] Form: customer, product browse, cart, shipping dialog, draft/pending/print
- [x] BFF proxy `/api/v1/auth/proxy/order/store-sales/*`
- [x] i18n `page-order-store.json` (th/en)

## Required checklist

- [x] `useResourcePermissions("order", "order_store")`
- [ ] Manual th locale: no `MISSING_MESSAGE`
- [ ] Storybook: only if shared molecules gain new props (none required this phase)
