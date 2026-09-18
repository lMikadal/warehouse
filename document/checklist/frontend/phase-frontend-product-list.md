# Phase: Product list (browse + form)

Production **สินค้า → รายการ** — parity with design `product-list.js` / `product-list-form.js`.

## Phase checklist

- [x] Routes `/admin/product/list`, `/list/new`, `/list/[id]` + `loading.tsx`
- [x] BFF proxies + [`product-list-api.ts`](../../../frontend/lib/product-list-api.ts)
- [x] List page: toolbar filters, server pagination/sort, car + warehouse modals, row selection + sticky bulk bar (`is_stopped`, bulk delete)
- [x] Tabbed form: data + pricing + history tabs; aggregate POST/PATCH + item PATCH
- [x] i18n `product-list.json`, `page.productList` / `page.productListForm`

## Required checklist

- [x] RBAC `product.product_list.*` via `useResourcePermissions`
- [x] List grain = `product_item`; no DnD column
- [x] Forms: placeholders, required asterisk fields, create vs edit leave labels
- [x] History tab wired to stub APIs; export → coming-soon toast
- [ ] Manual QA th/en with `make backend-seed-dev` + `14_product_demo.sql`

## Known gaps vs design (documented)

- List product cell **car fitment chip** (pill under SKU, opens modal) + dev seed `product_list_car` — done
- Category **overlay cascade** picker → flat searchable combobox with tree indent
- Warehouse **bin cascade** picker → bin-type warehouse list combobox
- Pricing tab: collapsible variant summary + five expanded sections; **section 3 storefront VAT axis** (`setting_vat` include/exclude) — done; section 2 → three FormCards (2 / 2.1 / 2.2); barcode/QR **generate** buttons (`ITEM-BC-{random}` / `ITEM-QR-{random}` on frontend; design mock still uses GS1 / `WH:sku` demo strings); lot stock dialog parity with design (grouped table, stats, CRUD); unified add/edit lot form dialog (bin from variant placements only; no table inline edit); lot partner picker scoped to list **`supplier_ids`** on data tab
- History grouped tables populate when purchase/order modules migrate
