# Phase: Warehouse list + management (frontend)

Sidebar **คลังสินค้า → รายการ / การจัดการ** (picker dialog) per design mockups.

## Phase checklist

- [x] Routes `/admin/warehouse/list`, `/admin/warehouse/list/view?id=`
- [x] BFF `app/api/v1/auth/proxy/warehouse/lists/*`
- [x] `lib/warehouse-api.ts`
- [x] List page: expandable warehouses, zone cards + quota table (shelf/rack/bin), CRUD sheet, stats columns
- [x] Management view: stats + zone tree with capacity bars
- [x] Nav `is_dialog` on `/auth/nav` + warehouse picker in `AdminBackofficeShell`
- [x] i18n `page-warehouse.json`, `warehouse.json`

## Required checklist

- [x] `loading.tsx` on list + view segments
- [x] Permissions `warehouse.warehouse_list.*` on actions and status switches
- [ ] Manual: login `admin`/`admin` → expand ATW → zone cards read-only quotas; edit via zone sheet (active ≤ max); Management dialog or list warehouse view (`view?id=`) → all zones collapsed; zone card view (`view?id=&zone=`) → only that zone expanded; management tree **one bordered card per zone** (stacked gap); stat cards + legend + nested design tree items (L-connectors, one row per node); add/edit/delete shelf/rack/bin; drag grip on slots only — menu-style DnD via `move`; zone rows not draggable; nest into zone over quota → toast `warehouse.moveQuotaFull` (not raw API English)
- [ ] Storybook: no new shared components (page-local `_shared` only)
