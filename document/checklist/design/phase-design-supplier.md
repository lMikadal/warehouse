# Phase: Supplier menu (design)

CRUD mockup for sidebar **คู่ค้า** — list page + full-page form (tabs) mapped to `supplier_user`, `supplier_information`, `supplier_contact`, `supplier_bank`.

## Phase checklist

- [x] Seed 4 supplier tables + merge in `seed/index.js` (`SEED_VERSION=supplier-crud-1`)
- [x] Wire menu id 22 → `pages/supplier-user.html`
- [x] Limit `supplier_user` permissions to view/create/update/delete (no import/export)
- [x] Add supplier seed scripts to all pages loading `seed/index.js`
- [x] List page `pages/supplier-user.html` + `module-registry` entry + `formHref` in `crud-list.js`
- [x] Form page `pages/supplier-user-form.html` + `js/pages/supplier-user-form.js`
- [x] th/en i18n for pages, columns, tabs, supplier copy
- [x] CSS for supplier form tabs, cards, sublists, stacked list cells

## Required checklist

- [x] Preview via HTTP (`make design-serve`) — `supplier-user.html` / `supplier-user-form.html` return 200
- [ ] Login `admin`/`admin` → sidebar **คู่ค้า** opens list with seed rows
- [ ] List: search, status filter, pagination, status switch, edit → form page, delete confirm
- [ ] Create: contacts and banks draft in memory until main save; save creates `supplier_user` + 3 `supplier_information` + pending contacts + pending banks
- [ ] Edit: tax invoice “same as contact” copies contact on save
- [ ] Geo cascade province → district → sub-district + postcode fill
- [ ] Unique SKU validation on save

## Out of scope

- Purchase history tab (v1 `SupplierPurchaseHistoryTab`)
- Real API / backend integration
