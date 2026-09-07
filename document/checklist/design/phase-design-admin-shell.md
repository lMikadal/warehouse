# Phase: Admin shell (login + sidebar)

Login page, dashboard shell, sidebar from `admin_menu` seed, RBAC via `permissions.can()`.

## Phase checklist

- [x] Add `is_active` to `admin_permission` schema
- [x] Seed `admin_*` tables (menu tree, permissions 6 actions/page, roles, users)
- [x] Mock auth (`js/auth.js`) + permission helper (`js/permissions.js`)
- [x] Shared layout: sidebar, header, modal, toast
- [x] Pages: `pages/login.html`, `pages/dashboard.html`
- [x] `index.html` redirects to login or dashboard
- [x] Lucide icons under `assets/icons/`
- [x] th/en i18n for login and shell chrome

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] Login `admin`/`admin` → full sidebar; `staff`/`staff` → subset, no superadmin group
- [x] Permission buttons on dashboard respect role + `is_active`
- [x] `make design-schema-check` passes

## Demo accounts

| User | Password | Notes |
|------|----------|-------|
| admin | admin | superadmin — all menus and actions |
| staff | staff | limited menus; no delete/import/export |
