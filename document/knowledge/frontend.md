# Frontend knowledge

Production Warehouse UI under `frontend/` — Next.js App Router, bun, Tailwind CSS v4, shadcn/ui.

## Bootstrap (done)

Scaffold + stack deps: Next.js 16.3.5, Tailwind v4, shadcn/ui, `lucide-react`, `next-themes`, **next-intl** (`th` + `en`, default **`th`**).

Env sample: `frontend/env.example` → `NEXT_PUBLIC_API_URL=http://localhost:1323/api/v1`.

## UI architecture (layer stack)

Production UI is built **top-down** through fixed layers. Agent rule: [`.cursor/rules/design-system.mdc`](../../.cursor/rules/design-system.mdc).

| Layer | Location | Notes |
|-------|----------|--------|
| Design tokens | `app/globals.css` | Color, spacing, radius, typography; no raw hex in components |
| shadcn / base UI | `components/ui/` | Full shadcn **base-nova** set (see **Atomic grouping** below) + **ButtonIcon**, **DatePicker**, **DataTable** (TanStack v8); Storybook `UI/*` |
| Molecules | `components/molecules/` | CRUD/search/pagination/table chrome from warehouse-list (see below) |
| Organisms | `components/organisms/` | **Not started** — Admin shell + list tables compose molecules in a later phase |
| Design system | Cursor rules + Storybook + this doc | forms, tables, dates, icons |
| Warehouse pages | `app/[locale]/…` | Inventory, orders, products, users, … |

Handoff from `design/` mockups is unchanged; warehouse-list patterns are extracted into **molecules** first; **organisms** and `app/[locale]/…` routes come next.

**App chrome:** `<TooltipProvider>` wraps locale layout children ([`app/[locale]/layout.tsx`](../../frontend/app/[locale]/layout.tsx)) for shadcn tooltips. **Hooks:** [`hooks/use-mobile.ts`](../../frontend/hooks/use-mobile.ts) supports `Sidebar` (not an atom — do not import from pages directly).

### Atomic grouping (`components/ui/` = atoms)

All shadcn CLI output stays in `components/ui/`. Molecules compose these with warehouse i18n/routing; organisms compose molecules (later).

| Group | `components/ui/` | Role |
|-------|------------------|------|
| Actions | `button`, `button-icon`, `button-group`, `toggle`, `toggle-group` | Clicks, segmented controls |
| Form controls | `input`, `textarea`, `checkbox`, `radio-group`, `switch`, `select`, `input-otp`, `input-group`, `label`, `field` | Controls + accessible field wrappers |
| Pickers | `calendar`, `date-picker`, `combobox`, `command`, `popover` | Date / searchable selection |
| Layout / surface | `card`, `separator`, `scroll-area`, `resizable`, `collapsible`, `item` | Containers, lists, panels |
| Navigation / chrome | `breadcrumb`, `tabs`, `pagination`, `dropdown-menu`, `sidebar`, `sheet` | Nav primitives (menu config lives in organisms) |
| Overlay | `dialog`, `drawer`, `popover`, `tooltip` | Modals, sheets, hints |
| Feedback | `progress`, `skeleton`, `spinner`, `sonner`, `marker` | Loading, progress, inline status |
| Media / identity | `avatar`, `badge` | User / entity visuals |
| Data display | `table`, `data-table` | Rows/columns; CRUD sort/pager still via molecules + [`lib/table-sort.ts`](../../frontend/lib/table-sort.ts) |

**Molecules (compose atoms):** `BreadcrumbNav` → `breadcrumb` + `@/i18n/navigation` `Link`; `FormField` → `field` + `input` (forms rules); `CrudPaginationBar` → `pagination` + `select` + [`lib/crud-pagination.ts`](../../frontend/lib/crud-pagination.ts).

**Organisms (future):** Admin shell (`sidebar` + header), CRUD list (`data-table` + TanStack + pagination/actions molecules), form pages (`FieldSet` / many `FormField`s).

Add primitives: `make frontend-shadcn-add COMPONENT=<name>` (style `base-nova`). **`date-picker`** and **`data-table`** are not in the CLI registry — maintained manually (`date-picker` = Calendar + Popover; `data-table` = `@tanstack/react-table@8` + `Table`).

### Molecules (warehouse-list baseline)

| Component | Role |
|-----------|------|
| `CrudSearchField` | Toolbar search (`search.placeholder`) |
| `StatusFilterGroup` | All / active / inactive segmented filter |
| `StatusSwitchField` | `is_active` switch with `col.status` aria-label |
| `StatusBadge` | Read-only active/inactive pill |
| `TableIconActions` | View / edit / add (green) / delete (red) icon row |
| `ExpandRowToggle` | Chevron expand control |
| `EntityNameCell` | Warehouse icon + name + optional inline edit |
| `FormField` | shadcn `Field` / `FieldLabel` / `FieldError` + `Input`; required asterisk, placeholder pattern, error slot |
| `BreadcrumbNav` | shadcn `Breadcrumb*` + `@/i18n/navigation` `Link` |
| `CrudPaginationBar` | shadcn `PaginationContent` / `PaginationItem` / `PaginationEllipsis` + page-size `Select` |
| `CrudPageHeader` | Title + description + actions slot |

Shared list pagination logic must not be duplicated — use `CrudPaginationBar` + `buildPageItems`.

Column header sort (data columns): `TableSortHead` + [`lib/table-sort.ts`](../../frontend/lib/table-sort.ts) (`cycleTableSort`, none → asc → desc → none). Pass i18n `sortLabel` from `crud.sortNone` / `sortAsc` / `sortDesc`. Non-sortable columns (grip, actions) stay plain `TableHead`.

## Design tokens

**Source of truth:** [`design/css/style.css`](../../design/css/style.css) — primary reference page [`design/pages/warehouse-list.html`](../../design/pages/warehouse-list.html). Also see [`design/design.json`](../../design/design.json) for global breakpoints and palette names.

**Implementation:** single file [`frontend/app/globals.css`](../../frontend/app/globals.css) — Warehouse `:root` / `.dark`, `@utility`, then `@import shadcn/tailwind.css`, `@theme inline`, `@layer base`. When design CSS changes for warehouse/admin CRUD, update the matching section in `globals.css` in the same change.

### Theme

- Light/dark: `next-themes` (`.dark` on `<html>`) + `data-theme="light|dark"` via `ThemeDocumentSync` (same keys as design: `warehouse-design-theme`)
- Typography: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` — no Geist

### Muted vs border vs subtle (warehouse-list)

| Variable | Light | Role on warehouse-list |
|----------|-------|-------------------------|
| `--color-muted` | `#e2e8f0` | Design name — same as border color on cards/tables |
| `--color-border` | `#e2e8f0` | `crud-table-wrap`, `wh-zone-card`, toolbar inputs |
| `--color-subtle` | `#f1f5f9` | Light fills (nav hover, shadcn `--muted` background) |
| `--border` / `--input` (shadcn) | `var(--color-border)` | Tailwind `border-border`, inputs |

Do not use shadcn `bg-muted` when the design intent is a **border** — use `border-border` / `border-warehouse-border`.

### Semantic CSS variables (warehouse-list)

| Variable | Role |
|----------|------|
| `--color-primary` | Primary blue, buttons, active nav |
| `--color-page-title` | Same as `--color-foreground` (CRUD h1 — not primary blue) |
| `--color-success-*` | `.wh-badge--active` |
| `--color-status-active-*` / `--color-status-inactive-*` | `.crud-badge--*` |
| `--color-action-add` | `#16a34a` — crud-add / green actions |
| `--color-action-delete` | `#dc2626` — crud-delete |
| `--color-warning` | `#d97706` light / `#fbbf24` dark — toast warning accent (design `.toast--warning`) |
| `--color-switch-checked` | `rgb(34 197 94)` — shadcn `Switch` / design `.crud-switch` track when on |
| `--color-row-expanded` | Expanded warehouse row background |
| `--color-nav-active-bg` | Sidebar active item |
| `--radius-table-wrap` | `0.75rem` — table + pagination chrome |
| `--shadow-zone-card` | Inner zone cards in expanded row |

Tailwind theme aliases: `--color-warehouse-*` in `@theme` (e.g. `bg-warehouse-border`, `text-warehouse-action-add`).

### shadcn bridge

| shadcn | Maps from |
|--------|-----------|
| `--primary` | `--color-primary` |
| `--background` | `--color-background` |
| `--muted` | `--color-subtle` (fill, not border) |
| `--border` | `--color-border` |
| `--destructive` | `--color-error` |
| `--sidebar-accent` | `--color-nav-active-bg` |

### Breakpoints (mobile-first)

| Tailwind | Width | Design name |
|----------|-------|-------------|
| default | &lt; 640px | mobile |
| `sm:` | ≥ 640px | tablet+ |
| `lg:` | ≥ 1024px | computer |
| `xl:` | ≥ 1440px | computerWide |

Custom variant: `tablet-landscape:` — `(min-width: 640px) and (orientation: landscape) and (max-height: 900px)`.

### Layout constants

| Token | Value |
|-------|-------|
| `--width-sidebar` | 16.25rem |
| `--max-width-crud-page` | 1280px (1440px from `xl` via `max-w-crud-page`) |
| `--max-width-form` | 26rem |

### Layout utilities

| Class | Use |
|-------|-----|
| `px-page` | Generic page horizontal padding (design.json `space.pagePadding`) |
| `px-admin-content` | `.admin-content` padding (warehouse shell main area) |
| `max-w-crud-page` | `.crud-page` max width |
| `grid-wh-zone` | Expanded row zone cards (1 → 2 → 3 columns) |
| `surface-table-wrap` | `.crud-table-wrap` |
| `bg-row-expanded` | `.wh-expanded-row` |
| `bg-page-wash` | `.admin-layout` atmosphere |
| `grid-form-row` / `grid-form-main-sidebar` | Form layouts (non-warehouse) |

Example CRUD content: `max-w-crud-page px-admin-content` inside `bg-page-wash`.

### Typography (admin / warehouse-list)

| Utility | Typical use |
|---------|-------------|
| `text-xs` | Table header |
| `text-sm` | Breadcrumb, meta |
| `text-base` | Table body |
| `text-xl` + bold | `.crud-page-header__title` (foreground color) |

### Notifications (toast)

Handoff from [`design/js/components/toast.js`](../../design/js/components/toast.js): top-right stack, types `success` | `error` | `warning` | `info`, 4s auto-dismiss (no close button — dismiss via timeout or swipe).

| Design | Frontend |
|--------|----------|
| `toast.show(msg, 'success')` | `toast.success(msg)` |
| `toast.show(msg, 'error')` | `toast.error(msg)` |
| `toast.show(msg, 'warning')` | `toast.warning(msg)` |
| `toast.show(msg, 'info')` | `toast.info(msg)` |

- **Host:** `<Toaster />` from `@/components/ui/sonner` once in `app/[locale]/layout.tsx` (inside `ThemeProvider`).
- **API:** `import { toast } from "sonner"` — pass translated strings at call sites (`toast.success(t('crud.saved'))`).
- **Styling:** overrides in `app/globals.css` on `[data-sonner-toast]` (left accent border, design shadow); Lucide icons in `sonner.tsx`.
- **Rule:** every mutation (POST/PATCH/DELETE) shows success or error toast — no silent mutations.

Storybook: **UI/Toaster** (`components/ui/sonner.stories.tsx`).

## i18n

- Locales: `th` (default), `en`
- Routes: ภาษาไทย (default) ที่ **`/`** ไม่มี `/th`; อังกฤษที่ **`/en`…**
- Messages: `frontend/messages/th.json`, `en.json`
- Config: `frontend/i18n/routing.ts`, `request.ts`, `navigation.ts`
- Client navigation: `@/i18n/navigation` (`Link`, `useRouter`, `usePathname`)
- Header: `LocaleSwitch` (ไทย / EN) + `ThemeModeSwitch`

Port more keys from `design/js/i18n/` into `messages/` as pages ship.

## Docker

- `frontend/Dockerfile.dev` / `Dockerfile.prod` — see compose in `infrastructure/`
- After `package.json` changes with compose up: `make docker-frontend-install`

## Dev commands

From repo root: `make frontend-dev`, `make frontend-build`, `make frontend-lint`, `make frontend-shadcn-add COMPONENT=<name>`, `make frontend-storybook`, `make frontend-storybook-build`.

## Stack (current)

| Piece | Approach |
|-------|----------|
| Next.js | 16.3.5 App Router `app/[locale]/` |
| i18n | next-intl, default `th` |
| Theme | next-themes, `storageKey` `warehouse-design-theme`, `data-theme` on `<html>` |
| Icons | lucide-react |
| Components | shadcn/ui → `components/ui/` |
| Design tokens | `app/globals.css` only |
| Storybook | `@storybook/nextjs` (Webpack), v10.6 |

## Storybook

- Global styles: `app/globals.css`; `ThemeProvider` + **`withIntl`** ([`.storybook/decorators/intl.tsx`](../../frontend/.storybook/decorators/intl.tsx)) in `.storybook/preview.tsx` — toolbar **locale** `th` / `en`
- Dev: `make frontend-storybook` → [http://localhost:6006](http://localhost:6006)
- Stories: `components/ui/*.stories.tsx` → **UI/**; `components/molecules/*.stories.tsx` → **Molecules/**; `stories/design-tokens.stories.tsx` → **Design system/Tokens**
- No **Organisms/** or **Pages/** stories until organism phase

### Component workflow (team agreement)

- Before new UI or design handoff: inventory `components/ui/`, `molecules/`, `organisms/`, and Storybook stories; compose existing pieces first.
- **New shared component** (new file/export in those layers or `make frontend-shadcn-add`): requires explicit user approval every time — see [`.cursor/rules/design-system.mdc`](../../.cursor/rules/design-system.mdc).
- After any change under `frontend/components/**`: run `make frontend-storybook-build` before considering the task done — see [`.cursor/rules/storybook.mdc`](../../.cursor/rules/storybook.mdc).

## Docs

- Agent skill: `.cursor/skills/frontend/SKILL.md`
- Phase checklists: `document/checklist/frontend/phase-frontend-*.md`
