# Design knowledge

Customer-facing Warehouse prototype under `design/` — HTML/CSS/vanilla JS only. No bundler, no real DB, no API calls.

## Stack

| Piece | Approach |
|-------|----------|
| Markup | Static HTML (`index.html`, later `pages/*.html`) |
| Styles | `css/style.css` with CSS variables |
| Scripts | Vanilla JS on `window` |
| Icons | Lucide SVG in `assets/icons/<name>.svg` ([lucide.dev/icons](https://lucide.dev/icons/)) |
| Mock DB | `js/seed/` → `js/store.js` → `localStorage` |
| Cross-tab | `js/realtime.js` via `BroadcastChannel` |

## Preview

```bash
make design-serve
```

Open `http://localhost:8080/`. Prefer HTTP over `file://` so `localStorage` and `BroadcastChannel` behave correctly. Do not run raw `python -m http.server` when this target exists.

## Script load order (every page)

1. `js/i18n/th.js` + `en.js` + `i18n.js`
2. `js/seed/index.js`
3. `js/store.js`
4. `js/realtime.js`
5. `js/components/*` (when added)
6. Page-specific script

## Theme

- Toggle with `data-theme="light|dark"` on `<html>`
- Default from `prefers-color-scheme` when unset
- Persist key: `warehouse-design-theme`
- Tokens: `--color-primary`, `--color-primary-foreground`, `--color-background`, `--color-foreground`, `--color-muted`

## i18n

- Dictionaries: `js/i18n/th.js`, `js/i18n/en.js`
- API: `i18n.init()`, `i18n.t(key)`, `i18n.setLocale('th'|'en')`, `i18n.getLocale()`
- Default locale: `th`
- Persist key: `warehouse-design-locale`
- Mark copy with `data-i18n="key"` for automatic re-render on locale change

## Icons

- Source: [Lucide](https://lucide.dev/icons/) only
- Files: `design/assets/icons/<lucide-name>.svg` (kebab-case)
- Prefer inline SVG + `currentColor` when the icon must follow theme; otherwise `<img>`
- No other icon packs, emoji chrome icons, or Lucide CDN scripts

## Store / realtime

- Store key: `warehouse-design-store`
- Seed: `window.SEED` (currently `{}` until `db/schema/` entities exist)
- Channel name: `warehouse-design`
- API: `store.init|getAll|getById|create|update|delete|reset`

## Breakpoints (mobile-first)

| Name | Width |
|------|-------|
| mobile | &lt; 640px |
| tablet | ≥ 640px |
| computer | ≥ 1024px |
| computer-wide | ≥ 1440px |

## Docs

- Phase checklists: `document/checklist/design/`

## Next

- Add screens under `pages/` and shared UI in `js/components/`
- Add `db/schema/*.sql` then matching seed tables
- Hand off approved UI to `/frontend`; schema-ready work to `/backend`
