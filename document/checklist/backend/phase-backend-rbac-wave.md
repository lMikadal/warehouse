# Phase: Backend RBAC wave

JWT auth, system_permission init seeds (split files), admin users/roles, system menus/permissions APIs.

## Phase checklist

- [x] `internal/rbac/perm_catalog.go` + init seeds `02`–`05_system_permission_*.sql`
- [x] JWT login / refresh / logout / me + `admin_user_session`
- [x] Auth + RBAC middleware on `/system/*`, `/admin/*`
- [x] System menus CRUD + move + subtree delete
- [x] System permissions list + patch `is_active`
- [x] Admin roles + users CRUD
- [x] Test seed `01_admin_bootstrap.sql`
- [x] Postman Auth / System / Admin folders
- [x] `document/knowledge/backend.md` updated

## Required checklist

- [x] `make backend-test` passes
- [x] `JWT_SECRET` documented in `backend/env.example`
- [x] Demo passwords documented (admin/staff) — test seed only
- [x] No real secrets in `document/`
