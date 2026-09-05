# Phase: Design bootstrap

Scaffold the Warehouse design prototype and ship a working Hello World homepage.

## Phase checklist

- [x] Create `design/` directory tree (`pages/`, `css/`, `js/i18n/`, `js/seed/`, `assets/`)
- [x] Add shared `css/style.css` with blue-white theme tokens and light/dark pairs
- [x] Add th/en i18n (`th.js`, `en.js`, `i18n.js`) with hello-world keys
- [x] Add empty seed + minimal `store.js` / `realtime.js` stubs
- [x] Add working `index.html` Hello World with theme + language toggles

## Required checklist

Must pass before this phase is done:

- [x] Preview via HTTP (`make design-serve`)
- [x] Default locale is Thai; language toggle switches th ↔ en and persists
- [x] Theme toggle switches light ↔ dark and persists (`data-theme` on `<html>`)
- [x] `store.init()` runs with empty seed without console errors
