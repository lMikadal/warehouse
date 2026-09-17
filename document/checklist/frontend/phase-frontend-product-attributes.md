# Phase: Product attribute admin pages

Split-pane tree + form for **หมวดหมู่ / แบรนด์ / หมวดหมู่รถยนต์** — parity with design `product-attribute.js`.

## Phase checklist

- [x] Routes `/admin/product/category`, `/brand`, `/car` + `loading.tsx`
- [x] Shared `ProductAttributePage` + BFF proxies + `product-attribute-api.ts`
- [x] i18n `page-product.json`, `product-attribute.json`
- [x] Menu seed paths ids 30–32 in `gen-system-menu-seed.ts`

## Required checklist

- [x] RBAC via `useResourcePermissions("product", permType)`
- [x] Category: tree-indented parent `RemoteComboboxField` (menu pattern) + `RemoteMultiComboboxField` for related brands; car: level + brand/model pickers on create
- [x] Left panel (category / brand / car): server paginated table, `CrudSearchField`, `StatusFilterGroup`, `CrudPaginationBar` (single `surface-table-wrap` frame, no outer card); category + car tree move DnD (child/before/after) with client validation when not filtering; brand flat sibling reorder DnD (`PATCH …/brands/reorder`) when not filtering
- [x] Split layout 2fr/1fr; right form card `h-fit` / `self-start`; car level select full width + i18n trigger label
- [x] Category/car table name indent via list `tree_path` + `treeDepth` (system menu pattern)
- [ ] Manual QA th/en on all three routes after `make backend-seed-dev`
