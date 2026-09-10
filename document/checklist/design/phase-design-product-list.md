# Phase: Product list (design)

Item-level list mockup for sidebar **สินค้า → รายการ**, aligned with frontend `ProductDataTable` and `product_list` / `product_item` schema.

## Phase checklist

- [x] Seeds: `product_list`, `product_list_language`, `product_list_car`, `product_item`, `product_item_language` (+ existing stock/warehouse placement seeds)
- [x] Page [`product-list.html`](../../../design/pages/product-list.html) + [`product-list.js`](../../../design/js/pages/product-list.js)
- [x] Product form [`product-list-form.html`](../../../design/pages/product-list-form.html) + [`product-list-form.js`](../../../design/js/pages/product-list-form.js) (tabs: details / pricing variants / history)
- [x] th/en `productListForm.*` copy; `.product-list-form__*` styles in `style.css`
- [x] Menu path `pages/product-list.html` (admin_menu id 29)
- [x] th/en `productList.*` / `page.productList*`
- [x] `SEED_VERSION` bump for re-seed
- [x] Page header actions (import / export / add) like admin-menu CRUD pages
- [x] Status + new-product filters as toolbar button groups; category + brand toolbar selects
- [x] Table category column (sortable) before brand; brand filter on `product_brand_id`
- [x] Table always renders column headers (empty state = one colspan row)
- [x] `store.js` re-seed when seed has `product_item` but localStorage snapshot does not
- [x] No row checkboxes / bulk bar; status column uses `crud-switch`; warehouse count via `i18n.format`
- [x] Column alignment: stock/price `data-table__col-numeric`; warehouse/status center; actions inner `div.data-table__actions`; `cols` drives matching `th`/`td` classes; scroll via `crud-table-wrap__body`
- [x] Seed item 1 in 3 warehouses (ATW/PJB/GS); warehouse placement dialog shows names only (no SKU suffix)
- [x] Bin-only placement (`.cursor/rules/warehouse.mdc`); `product_item_warehouse` seed stores `bin_id` only; UI resolves path via `warehouse-lib`
- [x] One bin → one product_item (unique `bin_id` in schema + seed; item 4 on bin 37)
- [x] Seeds: `product_item_price`, `product_item_supplier` (demo rows for variant expanded UI)
- [x] Pricing tab: expanded variant body — 5 sections; section 2 editable + saves `product_item` + `product_item_language`; section 1 without status switch
- [x] Pricing tab sections 4–5: section 4 channel prices in draft (defaults at 0, big save to `product_item_price`); `setting_vat` pricing axis; section 5 suppliers in draft (linked to Data tab partners, big save to `product_item_supplier`); warehouse tab cascade rows (draft → `product_item_warehouse` + qty on main save); promotion on main save
- [x] History tab: `data-plf-hist-tab` purchase / sales; read-only, styled like lot dialog (summary cards + colored grouped table, pager)
- [x] History tab: 3-view filter bar (day date-range / month range / year from-to) + รหัสสินค้า (`product_item`) + คู่ค้า/ลูกค้า selects, Clear filters, mock Export toast; per-tab `historyState`, period grouping
- [x] History tab: ประวัติซื้อ from `purchase_order_item` → `purchase_order` (5-card summary); ประวัติขาย from `order_order_item` → `order_order` (net sell − discount, cost = avg purchase cost, 4-card summary); seeds carry `ordered_at` across days/months/years

## Required checklist

- [ ] `make design-serve` → `pages/product-list.html` returns 200
- [ ] Login `admin`/`admin` → **สินค้า → รายการ** loads table with seed rows
- [ ] Search + category + brand + status + new-product filters; pagination 10/25/50/100
- [ ] Column header sort (no row drag — no `sort_order` on list/item tables)
- [ ] Car fitment modal + warehouse placement modal from seed
- [ ] Row delete / status toggle / bulk bar with toasts
- [ ] Locale switch re-renders labels
- [ ] **+ เพิ่มสินค้า** → create form saves `product_list` + languages + ≥1 `product_item`; Import/Export → coming-soon toast
- [ ] Edit (pencil) → `?product_list_id=` loads seed; save updates store; car table + partners (chip multi-select) + codes persist
- [ ] Category field opens cascade dialog; drill columns + search; confirm sets breadcrumb on form and persists `product_category_id` on save
- [ ] Form: required field inline errors; cancel/back label by mode; dev bar toasts
- [ ] Form: sidebar (status / summary / note) only on Data tab; hidden on pricing and history
- [ ] Form pricing tab: variant cards with warehouse “view more” table modal; status switch on card row
- [ ] Form pricing tab: expand variant → section 2 names/barcode/dimensions editable; save → reload persists; total stock still read-only

## Out of scope

- Persisting gallery upload on the form
- Full frontend `ProductItemCard` parity (history tab data)
- Backend API / Postman / `frontend/` implementation
