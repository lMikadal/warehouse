# Phase: Setting CRUD (backoffice)

Production UI for sidebar **ตั้งค่า** (7 leaves). Bank/sale-channel logos: see [`phase-frontend-image-upload.md`](phase-frontend-image-upload.md). Out of scope: `member_setting_relation_id` picker, import/export.

## Phase checklist

- [x] BFF proxy `app/api/v1/auth/proxy/setting/*` + [`lib/bff-setting-handlers.ts`](../../../frontend/lib/bff-setting-handlers.ts) + [`lib/setting-api.ts`](../../../frontend/lib/setting-api.ts)
- [x] Shared list/sheets under `setting/_shared/` (lang stack, codes, VAT list + edit sheet)
- [x] Routes: `/admin/setting/{bank,vat,payment-method,sale-channel,code,claim-reason,prefix}`
- [x] i18n `page-setting.json` (th/en) + col keys
- [x] List DnD reorder when unfiltered (prefix reorder when type filter selected)
- [x] Payment method toolbar filters `is_sale` / `is_purchase`
- [x] `make frontend-build` + `make frontend-lint`

## Required checklist

- [x] Permissions via `useResourcePermissions("setting", <type>)` per menu seed
- [x] VAT: edit-only (no add/delete/list pager); `is_active` switch in table + sheet; localized VAT type in select trigger
- [x] No export/import on setting lists
