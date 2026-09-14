# Phase: Admin backoffice shell

Admin chrome for `(backoffice)` routes — sidebar, header, main frame. Design source: [`design/js/components/layout.js`](../../../design/js/components/layout.js).

**Depends on:** [phase-frontend-ui-primitives.md](phase-frontend-ui-primitives.md), [phase-frontend-admin-login-ui.md](phase-frontend-admin-login-ui.md).

## Phase checklist

- [x] `components/organisms/admin-backoffice-shell.tsx` + Storybook **Organisms/AdminBackofficeShell**
- [x] Static nav data [`frontend/lib/admin-menu-mock.ts`](../../../frontend/lib/admin-menu-mock.ts) (`ADMIN_NAV_TREE`; until `admin_menu` API)
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
- [ ] CRUD list UI for `system/permission` (molecules + mock/API)
- [x] Dynamic sidebar from `GET /auth/nav`; real auth user in footer
- [ ] Menu edit form / `admin_menu` API wiring
