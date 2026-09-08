# Phase: Admin users and roles

CRUD mockup pages for sidebar **ผู้ดูแลระบบ → รายชื่อ / บทบาท** (`admin_user`, `admin_role`).

## Phase checklist

- [x] Wire menu paths in `admin_menu` seed (ids 12, 13)
- [x] Add `pages/admin-user.html` and `pages/admin-role.html`
- [x] Register `admin_user` and `admin_role` in `module-registry.js`
- [x] Extend `crud-list.js` for password field + function select options + optional `permissionMatrix`
- [x] th/en i18n for pages, columns, user status/type enums
- [x] Bump `SEED_VERSION` for menu path + permission junction reseed

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] Login `admin`/`admin` → sidebar **รายชื่อ** and **บทบาท** navigate and CRUD works
- [x] User list: pagination, column header sort, filters (role / type / status)
- [x] User form: password eye toggle; required password on create only
- [x] Login `staff`/`staff` → no **รายชื่อ** / **บทบาท** menus (no view permission)
- [x] Role list: bilingual name CRUD + `is_active` filter/switch
- [x] Role form: menu-grouped permission matrix (`admin_menu_permission` → UI; save syncs `admin_role_permission`)
- [x] Bump `SEED_VERSION` for `admin_menu_permission` (all 6 actions per leaf menu)

## Out of scope

- Backend API for role permissions (design mockup only)
