---
name: design
description: >-
  Build Warehouse HTML/CSS/JS prototypes with mock DB (seed, store, realtime),
  crud-list, dev-bar, schema SQL, blue-white theme, light/dark, th/en i18n.
  Use under design/ for mockups, pages, seed data, or demo CRUD without a real
  database.
---

# Design (customer prototype)

Warehouse app prototype for customer demos — change data locally without a build or a real DB.

## Agent navigation

- **Index:** [`.cursor/README.md`](../../README.md)
- **Invoke:** `/design`
- **Schema / enums / seed shape:** [`reference.md`](reference.md)

## Related rules (read when relevant)

| Topic | Rule |
|-------|------|
| Forms | [`.cursor/rules/forms.mdc`](../../rules/forms.mdc) |
| Tables / crud-list | [`.cursor/rules/tables.mdc`](../../rules/tables.mdc) |
| Date display | [`.cursor/rules/dates.mdc`](../../rules/dates.mdc) |
| Icons | [`.cursor/rules/icons.mdc`](../../rules/icons.mdc) |
| Bin placement | [`.cursor/rules/warehouse.mdc`](../../rules/warehouse.mdc) |
| Docs sync | [`.cursor/rules/document.mdc`](../../rules/document.mdc) |
| Commands | [`.cursor/rules/makefile.mdc`](../../rules/makefile.mdc) |

## Read order

1. This file — scope, mock DB, UX, dev bar
2. Rules from the table above for the task
3. [`reference.md`](reference.md) when editing `design/schema/` or seeds
4. `document/checklist/design/` + `document/knowledge/design.md` if behavior changes

## Scope

- Work in `design/**`
- Read [`design/design.json`](../../design/design.json) before building or restyling UI — visual tokens, breakpoints, components, UX rules
- Read `design/schema/**` so seed/store fields match real schema ([`reference.md`](reference.md))
- Do **not** touch `frontend/`, `backend/`, or call a real API
- When behavior/knowledge changes → update `document/checklist/design/` and `document/knowledge/design.md` (see `.cursor/rules/document.mdc`)

## Shared principles

1. **Warehouse app** — Everything is about the Warehouse app (users, products, orders, …); do not ship a generic off-domain template
2. **Reusable + maintainable** — Share UI in `js/components/`, name clearly, avoid duplication
3. **Strong security** — No real passwords/secrets in seed; do not inject unsanitized user HTML; mock only — no live DB
4. **Responsive** — mobile / tablet portrait / tablet landscape / computer / computer-wide (see `design/design.json` and breakpoints below)
5. **Theme: blue + white** — White background (light) + blue accent; tokens in `css/style.css`
6. **Light + dark mode** — Toggleable; default from `prefers-color-scheme`; persist in `localStorage`; paired light/dark tokens
7. **i18n: th + en** — Dictionaries in `js/i18n/`; language switcher; default `th`; do not hardcode a single language in UI
8. **Icons: Lucide SVG** — From [Lucide](https://lucide.dev/icons/); store under `assets/icons/`; no emoji-as-UI-icons or other packs

### Breakpoints (mobile-first)

Full definitions in [`design/design.json`](../../design/design.json) → `breakpoints`.

| Name | Rule | Notes |
|------|------|-------|
| mobile | &lt; 640px | base; single column; drawer nav; large touch targets |
| tabletPortrait | ≥ 640px and &lt; 1024px + `portrait` | wider single column; drawer nav |
| tabletLandscape | ≥ 640px + `landscape` + short height (≤ 900px) | two columns where helpful; reduce vertical padding |
| computer | ≥ 1024px | sticky sidebar; split auth panel; more breathing room |
| computerWide | ≥ 1440px | content max-width ~1280–1440px centered; no edge-to-edge forms/tables |

### Theme tokens

| Token | Role |
|-------|------|
| `--color-primary` | Primary blue |
| `--color-primary-foreground` | Text on primary |
| `--color-background` | Surface (light = white, dark = dark) |
| `--color-foreground` | Text on surface |
| `--color-muted` | Muted surface / soft borders |

- Light: white surface + clear blue; Dark: dark surface + blue with enough contrast
- Toggle with `data-theme="light|dark"` on `html` (same as frontend)
- Theme toggle in the shell; light/dark hex pairs live in one place in `style.css`

### i18n (design)

- `js/i18n/th.js`, `js/i18n/en.js`, `js/i18n/i18n.js`
- UI chrome (labels, buttons, nav) lives in dictionaries — not in SQL
- Stored multilingual content uses `*_language` tables (see [`reference.md`](reference.md)); pick rows by current locale
- Load i18n before page scripts
- **Date/datetime display** → [`.cursor/rules/dates.mdc`](../../rules/dates.mdc); use `i18n.formatDateTime(iso)` / `i18n.formatDate(iso)` — do not use raw `toLocaleString`

### Icons (design)

- Source: [Lucide icons](https://lucide.dev/icons/) only
- Path: `design/assets/icons/<lucide-name>.svg` (kebab-case, e.g. `sun.svg`, `languages.svg`)
- Use `<img src="assets/icons/….svg">` for simple assets; inline the same SVG markup when color must follow theme (`currentColor` + CSS)
- Icons inside `.btn` must match button text color — global rules in `css/style.css` (`.btn img`, `.btn--primary img`); see `.cursor/rules/icons.mdc`
- Keep Lucide stroke defaults; theme via CSS so light/dark stays readable
- No npm icon packages, icon font CDNs, or emoji for chrome/actions

## Project structure (required)

```
warehouse/
├── design/
│   ├── index.html
│   ├── pages/
│   ├── schema/
│   ├── css/style.css
│   ├── js/
│   │   ├── i18n/
│   │   ├── seed/
│   │   ├── store.js
│   │   ├── realtime.js
│   │   └── components/
│   └── assets/icons/
└── README.md
```

Add new pages under `pages/` with the same pattern. Add matching seed files and schema SQL when new entities appear.

## Layer roles

| Path | Role |
|------|------|
| `pages/*.html` | One screen per file — load `style.css` + shared scripts |
| `css/style.css` | Shared CSS + variables for fast theme tweaks |
| `js/seed/` | Initial mock data only — align shapes with `design/schema/` |
| `js/store.js` | Mock DB: init from seed, CRUD, persist `localStorage` |
| `js/realtime.js` | On store change → `BroadcastChannel` → other tabs re-render |
| `js/components/` | Reusable DOM (sidebar, modal, toast, crud-list) — no framework |
| `assets/icons/` | Lucide SVGs only |
| `schema/*.sql` | Source of truth for data shape — see [`reference.md`](reference.md) |

## Stack

- HTML + CSS + vanilla JS only
- No React, Next, bundler, npm, or backend API calls
- No PostgreSQL / Redis connection from design

## Mock DB flow

1. Page load → `store.init()` — load seed into `localStorage` if empty
2. Page uses `store.getAll` / `getById` / `create` / `update` / `delete`
3. Persist to `localStorage`
4. `realtime.broadcast()` → other tabs update

### Script load order (every page)

1. `js/i18n/th.js` + `en.js` + `i18n.js`
2. `js/seed/index.js`
3. `js/store.js`
4. `js/realtime.js`
5. `js/components/*.js` (sidebar, modal, toast)
6. Page-specific script (inline or `js/pages/<name>.js` if needed)

### Store API (keep small)

```js
store.init()
store.getAll(table)
store.getById(table, id)
store.create(table, row)
store.update(table, id, patch)
store.delete(table, id)
store.reset() // optional: clear localStorage and re-seed
```

### Realtime

- Channel name: one constant (e.g. `warehouse-design`)
- Payload: `{ type, table }` or full snapshot — keep listeners dumb: re-read from `store` and re-render

## Data shape (schema)

Table naming, columns, enums, trees, audit, and multilingual rules live in **[`reference.md`](reference.md)**. Read it before adding or changing `design/schema/*.sql` or seed files.

## Page pattern

- Shared shell: sidebar + main + toast + language toggle + theme toggle
- Mobile-first across all four breakpoints; copy via i18n (`th`/`en`)
- Placeholder data realistic enough to demo CRUD
- Theme tweaks only via CSS variables (light/dark pairs) at the top of `style.css`

## Preview

Serve with HTTP (localStorage / BroadcastChannel work better than `file://`). From repo root:

```bash
make design-serve
```

## Handoff

| After | Next skill |
|-------|------------|
| Customer approves UI | `/frontend` — implement in Next.js |
| Schema in `design/schema/` is ready | `/backend` — migrations + API |

## Dev Bar (design-only testing panel)

Every `design/pages/*.html` page **must** include `dev-bar.js` and call `devBar.mount()` at the end of its init script. The bar is a fixed amber-accented strip at the bottom of the viewport — visible only in the prototype, never copied to `frontend/`.

### Load order

Add after the last component script (toast, modal, sidebar, layout …):

```html
<script src="../js/components/dev-bar.js"></script>
```

### API

```js
devBar.mount({
  toasts: [
    { type: 'success', label: 'Success: saved', msg: 'Operation completed successfully.' },
    { type: 'error', label: 'Error: forbidden', msgKey: 'error.forbidden' },
  ],
  actions: [
    { label: 'Reset store', fn: function () { store.reset(); location.reload(); } },
    {
      group: 'Status',
      items: [
        { label: 'pending', fn: function () { /* set state */ } },
      ],
    },
  ],
});
```

- `toasts`: `{ type, label?, msgKey?, msg? }` — `type` is `success` | `error` | `warning` | `info`
- Page `actions` use `store.*` only; no real API calls
- On `login.html`, list active `admin_user` rows as one-click login buttons

See existing pages for full examples. Never include `dev-bar.js` in `frontend/`.

## UX patterns (design)

### Feedback — always show a result

| Trigger | UI response |
|---------|-------------|
| Successful create / update / delete | `toast.show(msg, 'success')` |
| Validation or logic error | `toast.show(msg, 'error')` or inline error under the field |
| Destructive action (delete) | Confirm modal before executing; success toast after |

Never mutate data silently. Every `store.create / update / delete` call must be followed by visible feedback.

### Loading and empty states

- Tables / lists with no rows: show an empty-state message (not a blank area)
- Disable submit during mock async actions

### Tables

Follow [`.cursor/rules/tables.mdc`](../../rules/tables.mdc). Shared pager: `js/components/crud-list.js`; drag-and-drop via `sortable: true` in `module-registry.js` only when schema has `sort_order` (or tree sibling order).

### Forms

Follow [`.cursor/rules/forms.mdc`](../../rules/forms.mdc). Design helpers: `password-toggle.js`, `tel-input.js`, `data-i18n-placeholder-input` / `-select` on fields.

### Error copy (i18n keys)

Use `js/i18n/th.js` + `en.js` — e.g. `toast.show(i18n.t("error.required"), "error");`

### Toast

- `js/components/toast.js` — `toast.show(msg, type)` where `type` is `success` | `error` | `warning` | `info`
- Fixed top-right stack; auto-dismiss ~4s; Lucide icons in `assets/icons/`

## Do not

- Connect real DB or Redis
- Edit `frontend/` or `backend/` from this skill
- Add heavy business logic beyond demo CRUD
- Introduce a framework or package manager under `design/`
- Use non-Lucide icon libraries or emoji as UI icons
- Include `dev-bar.js` in `frontend/` — it is design-only tooling
