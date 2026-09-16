# Phase: Frontend supplier CRUD

Full-page list + tabbed form at `/admin/supplier` (no sheet).

## Phase checklist

- [x] BFF proxy `/api/v1/auth/proxy/supplier/users` (+ nested contacts/banks)
- [x] `lib/supplier-user-api.ts`
- [x] List page `/admin/supplier`
- [x] Form pages `/admin/supplier/new`, `/admin/supplier/[id]`
- [x] i18n `page-supplier.json`, `supplier.json`, `col` keys

## Required checklist

- [x] Permissions `supplier` / `supplier_user`
- [x] List: search, status filter, pagination, header sort, status toggle, navigate to form
- [x] Form: tabs General / Contacts / Financial; dialog modals; geo + prefix comboboxes
- [x] `document/knowledge/frontend.md` updated
