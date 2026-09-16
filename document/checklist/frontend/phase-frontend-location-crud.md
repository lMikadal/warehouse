# Phase: Location CRUD (frontend)

Production UI for sidebar **สถานที่** — list CRUD, dynamic sidebar links, detail stub.

## Phase checklist

- [x] BFF `app/api/v1/auth/proxy/location/locations/*` + [`lib/location-api.ts`](../../../frontend/lib/location-api.ts)
- [x] Routes `/admin/location/locations`, `/admin/location/[id]` + `loading.tsx`
- [x] Shared [`location/_shared/`](../../../frontend/app/[locale]/(admin)/admin/(backoffice)/location/_shared/) list + edit sheet
- [x] Layout: `mergeLocationNavNodes` + active list fetch when `location.location_location.view`
- [x] `router.refresh()` after list mutations (sidebar sync)
- [x] i18n `page-location.json` (th/en)
- [x] `make frontend-build` + `make frontend-lint`

## Required checklist

- [x] Permissions via `useResourcePermissions("location", "location_location")`
- [x] Table: search, status filter, pagination, DnD reorder, create/edit sheet, status switch, delete confirm
- [ ] Manual: create location → name in sidebar without full reload; deactivate → removed; click name → coming soon stub + breadcrumb
