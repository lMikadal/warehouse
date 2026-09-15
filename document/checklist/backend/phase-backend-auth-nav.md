# Phase: Auth nav API (frontend handoff)

Bearer-only `/auth/nav` + `landing_path` on login for admin middleware and sidebar.

## Phase checklist

- [x] Split Echo groups: Bearer-only (`/auth/me`, `/auth/nav`, `/auth/permissions`) vs Bearer + RBAC (`/system/*`, `/admin/*`)
- [x] Nav reads view permission from `system_menu_permission` + `system_permission` (not computed codes in Go)
- [x] Full permission catalog init (`06_system_permission_catalog.sql`) + junction in `07_system_menu.sql`
- [x] `GET /auth/nav` returns filtered tree + `landing_path`
- [x] `GET /auth/permissions` returns active permission codes for backoffice UI gating
- [x] Login / refresh JSON includes `landing_path`

## Required checklist

- [x] `go test ./internal/module/system/...` (nav filter + junction rules)
- [x] Postman Auth folder includes **Nav**
- [x] `document/knowledge/backend.md` updated
- [x] Seed generators: `frontend/scripts/lib/perm-catalog-seed.ts`, `menu-perm-resolve.ts`, `gen-system-*-seed.ts`
