# Phase: Admin shell (login + sidebar)

Login page, admin shell, sidebar from `admin_menu` seed, RBAC via `permissions.can()`.

## Phase checklist

- [x] Add `is_active` to `admin_permission` schema
- [x] Seed `admin_*` tables (menu tree, permissions 6 actions/page, roles, users)
- [x] Mock auth (`js/auth.js`) + permission helper (`js/permissions.js`)
- [x] Shared layout: sidebar, header, modal, toast
- [x] Pages: `pages/login.html` + 7 Super Admin list pages (`admin-menu`, `admin-permission`, `admin-language`, `website-country`, `website-province`, `website-district`, `website-sub-district`)
- [x] Shared CRUD engine: `js/components/crud-list.js`, `js/pages/module-registry.js`, `js/pages/module-page.js`
- [x] `index.html` links to login (dev hub)
- [x] Lucide icons under `assets/icons/`
- [x] th/en i18n for login and shell chrome

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] Login `admin`/`admin` → full sidebar; `staff`/`staff` → subset, no superadmin group
- [x] Login `admin`/`admin` → lands on Menu list; all 7 Super Admin submenu pages navigate and CRUD (where allowed)
- [x] Permission page read-only with `is_active` toggle; Menu page edit-only (no create)
- [x] `make design-schema-check` passes

## Demo accounts

| User | Password | Notes |
|------|----------|-------|
| admin | admin | superadmin — all menus and actions |
| staff | staff | limited menus; no delete/import/export |
