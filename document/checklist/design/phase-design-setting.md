# Phase: Settings submenu CRUD

CRUD mockup pages for sidebar **ตั้งค่า** → seven leaves (`setting_bank`, `setting_vat`, `setting_payment_method`, `setting_sale_channel`, `setting_code`, `setting_claim_reason`, `setting_prefix`).

## Phase checklist

- [x] Wire menu paths in `admin_menu` seed (ids 15–21)
- [x] Add `pages/setting-*.html` (7 pages)
- [x] Register all setting modules in `module-registry.js`
- [x] Add `js/seed/setting_*.js` + merge in `seed/index.js`
- [x] th/en i18n for pages, columns, enums, errors
- [x] Bump `SEED_VERSION` to `setting-crud-1`
- [x] VAT singleton: one seed row, edit-only (`canCreate`/`canDelete` false); no search / pagination (`showSearch` / `showPagination` false)
- [x] Setting pages: no export/import buttons (`canExport`/`canImport` false)
- [x] Setting permissions: VAT `view`+`update` only; other setting types omit import/export
- [x] Bump `SEED_VERSION` to `setting-vat-singleton-1`

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] All seven `pages/setting-*.html` return HTTP 200; registry + seed smoke test passes
- [x] Claim reason: at least one of claim/return required on save (validated in registry)
- [x] Prefix: unique `code` validation (validated in registry)
- [x] Sale channel: exclusive default switch via `statusSwitchField: is_default`
- [x] Staff role seed has no `setting.*.view` permissions (Settings group hidden for `staff`/`staff`)
- [x] VAT page: single row, no Add/Export/Delete; edit modal works
- [x] Other setting pages: no Export/Import header buttons
- [x] Permission seed: no `setting.*.import` / `setting.*.export`; `setting_vat` has no create/delete
- [x] `setting_vat`: no `sort_order` in schema → `sortable: false` (global rule in `.cursor/rules/tables.mdc`)

## Out of scope

- `website_file_id` logo upload on bank / sale channel
- `member_setting_relation_id` on sale channel
- `member_setting_*` pages (Member menu)
