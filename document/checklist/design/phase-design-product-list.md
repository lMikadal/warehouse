# Phase: Product list (design)

Item-level list mockup for sidebar **สินค้า → รายการ**, aligned with frontend `ProductDataTable` and `product_list` / `product_item` schema.

## Phase checklist

- [x] Seeds: `product_list`, `product_list_language`, `product_list_car`, `product_item`, `product_item_language` (+ existing stock/warehouse placement seeds)
- [x] Page [`product-list.html`](../../../design/pages/product-list.html) + [`product-list.js`](../../../design/js/pages/product-list.js)
- [x] Stub form [`product-list-form.html`](../../../design/pages/product-list-form.html) (coming soon)
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

## Required checklist

- [ ] `make design-serve` → `pages/product-list.html` returns 200
- [ ] Login `admin`/`admin` → **สินค้า → รายการ** loads table with seed rows
- [ ] Search + category + brand + status + new-product filters; pagination 10/25/50/100
- [ ] Column header sort (no row drag — no `sort_order` on list/item tables)
- [ ] Car fitment modal + warehouse placement modal from seed
- [ ] Row delete / status toggle / bulk bar with toasts
- [ ] Locale switch re-renders labels
- [ ] **+ เพิ่มสินค้า** → stub form; Import/Export → coming-soon toast

## Out of scope

- Full product create/edit form (variants, codes, suppliers, gallery upload)
- Backend API / Postman / `frontend/` implementation
