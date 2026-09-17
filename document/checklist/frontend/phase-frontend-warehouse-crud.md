# Phase: Warehouse list + management (frontend)

Sidebar **คลังสินค้า → รายการ / การจัดการ** (picker dialog) per design mockups.

## Phase checklist

- [x] Routes `/admin/warehouse/list`, `/admin/warehouse/list/view?id=`
- [x] BFF `app/api/v1/auth/proxy/warehouse/lists/*`
- [x] `lib/warehouse-api.ts`
- [x] List page: expandable warehouses, zone preview, CRUD sheet, stats columns
- [x] Management view: stats + zone tree with capacity bars
- [x] Nav `is_dialog` on `/auth/nav` + warehouse picker in `AdminBackofficeShell`
- [x] i18n `page-warehouse.json`, `warehouse.json`

## Required checklist

- [x] `loading.tsx` on list + view segments
- [x] Permissions `warehouse.warehouse_list.*` on actions and status switches
- [ ] Manual: login `admin`/`admin` → list expand ATW zones; Management dialog → view tree + capacity from dev seed stock
- [ ] Storybook: no new shared components (page-local `_shared` only)
