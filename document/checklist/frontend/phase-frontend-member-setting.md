# Phase: Member settings CRUD (backoffice)

Production UI for sidebar **สมาชิก → ตั้งค่า** (credit, group, business).

## Phase checklist

- [x] BFF proxy `app/api/v1/auth/proxy/member/settings/*` + [`lib/bff-member-setting-handlers.ts`](../../../frontend/lib/bff-member-setting-handlers.ts) + [`lib/member-setting-api.ts`](../../../frontend/lib/member-setting-api.ts)
- [x] Shared list/sheets under `member/_shared/` (lang list for credit/group; business list with expand relations)
- [x] Routes: `/admin/member/settings/{credit,group,business}`
- [x] i18n `page-member-setting.json` (th/en) + `error.skuTaken`
- [x] `make frontend-build` + `make frontend-lint`

## Required checklist

- [x] Permissions via `useResourcePermissions("member", <type>)` per menu seed
- [x] Credit/group: SKU + th/en names; no list DnD (no `sort_order`)
- [x] Business: expandable relation rows; relation status/delete; create/edit sheet with credit×group multi-select (cartesian sync via API)
- [x] Co-located `loading.tsx` per route (`CrudListPageSkeleton`)
- [x] No import/export on these lists
