# Phase: Location menu (design)

CRUD mockup for sidebar **สถานที่** — list page with table + dialog; active locations injected into sidebar under **รายการ**; detail stub per location.

## Phase checklist

- [x] Seed `location_location` + `location_location_language` (3 demo rows)
- [x] Merge in `seed/index.js` (`SEED_VERSION=location-crud-1`)
- [x] Wire menu id 24 → `pages/location-location.html`
- [x] Limit `location_location` permissions to view/create/update/delete
- [x] Add location seed scripts to all pages loading `seed/index.js`
- [x] List page `pages/location-location.html` + `module-registry` entry via `settingLangConfig`
- [x] Sidebar inject active locations under map-pin group (after **รายการ**)
- [x] Detail stub `pages/location-location-view.html?id=`
- [x] th/en i18n for page title, description, coming soon
- [x] Same-tab sidebar refresh via `store:change` event

## Required checklist

- [ ] Preview via HTTP (`make design-serve`) — `location-location.html` returns 200
- [ ] Login `admin`/`admin` → sidebar **สถานที่** shows **รายการ** + seed location names (2 active)
- [ ] List: search, status filter, pagination, drag sort, create/edit dialog, status switch, delete confirm
- [ ] After create: new name appears in sidebar without reload
- [ ] After deactivate/delete: name removed from sidebar
- [ ] Click sidebar location → view stub with breadcrumb **สถานที่ > {name}**

## Out of scope

- Location dashboard / warehouse layout (V1 detail page is coming soon)
- Real API / backend integration
