# Phase: Admin backoffice shell

Admin chrome for `(backoffice)` routes — sidebar, header, main frame. Design source: [`design/js/components/layout.js`](../../../design/js/components/layout.js).

**Depends on:** [phase-frontend-ui-primitives.md](phase-frontend-ui-primitives.md), [phase-frontend-admin-login-ui.md](phase-frontend-admin-login-ui.md).

## Phase checklist

- [x] `components/organisms/admin-backoffice-shell.tsx` + Storybook **Organisms/AdminBackofficeShell**
- [x] ~~Static nav mock~~ removed; sidebar from `GET /auth/nav` via [`lib/admin-nav-api.ts`](../../../frontend/lib/admin-nav-api.ts)
- [x] [`(backoffice)/layout.tsx`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/layout.tsx) wraps children with shell
- [x] i18n keys: `nav.*`, `adminNav.*`, `page.*` (menu/permission labels)
- [x] `document/knowledge/frontend.md` updated

## Required checklist

- [x] `/admin/system/menu` and `/admin/system/permission` render inside shell (placeholder page bodies OK)
- [x] `make frontend-build` passes
- [x] `make frontend-lint` passes
- [x] `make frontend-storybook-build` passes

## Follow-up (not this phase)

- [x] CRUD list UI for `system/menu` (molecules + mock — [`system-menu-list.tsx`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/menu/system-menu-list.tsx), [`lib/admin-menu-mock.ts`](../../../frontend/lib/admin-menu-mock.ts))
- [x] CRUD list UI for `system/permission` ([`system-permission-list.tsx`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/permission/system-permission-list.tsx), [`lib/system-permission-api.ts`](../../../frontend/lib/system-permission-api.ts) → BFF → `GET/PATCH /v1/system/permissions`; read-only catalog, `is_active` switch only)
- [x] Dynamic sidebar from `GET /auth/nav`; real auth user in footer
- [x] Menu edit form / `admin_menu` API wiring ([`lib/system-menu-api.ts`](../../../frontend/lib/system-menu-api.ts), BFF [`app/api/v1/system/menus/`](../../../frontend/app/api/v1/system/menus/); create/delete UI commented out on menu list)
- [x] Menu list server-driven search, status filter, pagination, column sort ([`system-menu-list.tsx`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/menu/system-menu-list.tsx) → `GET /v1/system/menus`)
- [x] Admin roles / users CRUD ([`admin/roles`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/admin/roles/), [`admin/users`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/admin/users/) → BFF `/api/v1/auth/proxy/admin/*`, role permission matrix → `GET /v1/system/menus/permission-matrix`)
- [x] Permission-gated CRUD chrome on wired `admin/*` + `system/*` lists (`GET /auth/permissions`, [`lib/admin-permissions.ts`](../../../frontend/lib/admin-permissions.ts), dev seed accounts in [`document/knowledge/backend.md`](../../knowledge/backend.md))
