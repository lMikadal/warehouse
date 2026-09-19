# Phase: Setting CRUD (backoffice)

Production UI for sidebar **ตั้งค่า** (7 leaves). Bank/sale-channel logos: see [`phase-frontend-image-upload.md`](phase-frontend-image-upload.md). Out of scope: `member_setting_relation_id` picker, import/export.

## Phase checklist

- [x] BFF proxy `app/api/v1/auth/proxy/setting/*` + [`lib/bff-setting-handlers.ts`](../../../frontend/lib/bff-setting-handlers.ts) + [`lib/setting-api.ts`](../../../frontend/lib/setting-api.ts)
- [x] Shared list/sheets under `setting/_shared/` (lang stack, codes, VAT list + edit sheet)
- [x] Routes: `/admin/setting/{bank,vat,payment-method,sale-channel,code,claim-reason,prefix}` + co-located `loading.tsx` ([`setting-list-skeleton.ts`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/setting/_shared/setting-list-skeleton.ts))
- [x] i18n `page-setting.json` (th/en) + col keys
- [x] List DnD reorder when unfiltered (prefix reorder when one of `is_person` / `is_company` filters is yes)
- [x] Payment method toolbar filters `is_sale` / `is_purchase` (select combobox); inline switches on sale/purchase columns
- [x] Claim reason toolbar filters `is_claim` / `is_return` (select combobox); inline switches on claim/return columns
- [x] Prefix toolbar filters `is_person` / `is_company`; inline switches (no code column); create/edit audience switches
- [x] `make frontend-build` + `make frontend-lint`

## Required checklist

- [x] Permissions via `useResourcePermissions("setting", <type>)` per menu seed
- [x] VAT: edit-only (no add/delete/list pager); `is_active` switch in table + sheet; localized VAT type in select trigger
- [x] No export/import on setting lists
