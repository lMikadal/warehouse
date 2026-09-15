# Phase: Product attributes (design)

Split-pane CRUD mockups for sidebar **สินค้า** → หมวดหมู่ / แบรนด์ / หมวดหมู่รถยนต์ — shared [`product-attribute.js`](../../../design/js/pages/product-attribute.js) on `product_attribute` + `product_attribute_language` + `product_attribute_relation` (categories only).

## Phase checklist

- [x] Seed `product_attribute` + language + relation in [`product_attribute.js`](../../../design/js/seed/product_attribute.js)
- [x] Pages `product-category.html`, `product-brand.html`, `product-car.html` boot `productAttributePage.boot()`
- [x] Form rules: placeholders, required `*`, per-field errors, car `is_active` switch
- [x] Category related brands: searchable multi-select dropdown (`form-search-select--multi`)
- [x] Tree drag-and-drop: category cross-parent reparent + sibling reorder (`parent_id`, `sort_order`, `tree_path`); brand/car sibling-only
- [x] Cross-tab sync via `realtime.onMessage`
- [x] th/en i18n (`page.product*`, `productAttr.*`)

## Required checklist

- [ ] Preview via HTTP (`make design-serve`) — three product attribute pages return 200
- [ ] Login `admin`/`admin` → sidebar **สินค้า** → each sub-page loads tree + form
- [ ] Create / edit / delete with success toasts; empty required fields show inline errors
- [ ] Category: parent select + brand checklist; car: brand → model → engine cascade
- [ ] Category: cross-parent drag (child → another root row or empty sub-list becomes child; child → sibling row in sub-list; promote to root) persists after reload; root with subcategories blocked under another root (`productAttr.dragHasChildren`); brand cross-group drag shows `crud.dragSiblingOnly`
- [ ] Car: drag reorder only among siblings at the same `type_car` level (brand / model / engine) under the same `parent_id`; cross-brand/model/engine drop shows `crud.dragSiblingOnly` (including same index)
- [ ] Locale switch re-renders labels without losing edit state

## Related phase

- Product list table mockup: [`phase-design-product-list.md`](phase-design-product-list.md)

## Out of scope (this phase)

- Full product form CRUD (see product-list stub only)
- `system_file_id` logo upload on attributes
- `module-registry` / `crud-list` conversion for attribute pages
