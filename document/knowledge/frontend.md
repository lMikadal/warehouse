# Frontend knowledge

Production Warehouse UI under `frontend/` — Next.js App Router, bun, Tailwind CSS v4, shadcn/ui.

## Bootstrap (done)

Scaffold + stack deps: Next.js 16.3.5, Tailwind v4, shadcn/ui, `lucide-react`, `next-themes`, **next-intl** (`th` + `en`, default **`th`**).

Env sample: `frontend/env.example` → `NEXT_PUBLIC_API_URL=http://localhost:1323/api` (BFF calls append `/v1/…`).

## UI architecture (layer stack)

Production UI is built **top-down** through fixed layers. Agent rule: [`.cursor/rules/design-system.mdc`](../../.cursor/rules/design-system.mdc).

| Layer | Location | Notes |
|-------|----------|--------|
| Design tokens | `app/globals.css` | Color, spacing, radius, typography; no raw hex in components |
| shadcn / base UI | `components/ui/` | Full shadcn **base-nova** set (see **Atomic grouping** below) + **ButtonIcon**, **DatePicker**, **DataTable** (TanStack v8); Storybook `UI/*` |
| Molecules | `components/molecules/` | CRUD/search/pagination/table chrome from warehouse-list (see below) |
| Organisms | `components/organisms/` | **Admin backoffice shell** (`AdminBackofficeShell`); CRUD list organisms still deferred |
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

**Organisms:** **`AdminBackofficeShell`** — `SidebarProvider` + brand/search/collapsible nav/footer + header (`BreadcrumbNav`, `LocaleThemeToolbar`) + `bg-page-wash` main; Storybook **Organisms/AdminBackofficeShell**. Runtime nav tree: server [`fetchAuthNav`](../../frontend/lib/auth-server.ts) → `GET /v1/auth/nav`, mapped in [`lib/admin-nav-api.ts`](../../frontend/lib/admin-nav-api.ts) (`apiNavTreeToAdminNodes`, breadcrumbs, sidebar search filter).

**Organisms (future):** CRUD list shell (`data-table` + TanStack + pagination/actions molecules), form pages (`FieldSet` / many `FormField`s).

Add primitives: `make frontend-shadcn-add COMPONENT=<name>` (style `base-nova`). **`date-picker`** and **`data-table`** are not in the CLI registry — maintained manually (`date-picker` = Calendar + Popover, default `mode="single"` with ISO `YYYY-MM-DD`; `mode="range"` uses `{ from?, to? }` ISO strings, two-month calendar, closes when both ends are set; `data-table` = `@tanstack/react-table@8` + `Table`).

### Molecules (warehouse-list baseline)

| Component | Role |
|-----------|------|
| `CrudSearchField` | Toolbar search (`search.placeholder`) |
| `StatusFilterGroup` | All / active / inactive segmented filter |
| `StatusSwitchField` | `is_active` switch with `col.status` aria-label |
| `StatusBadge` | Read-only active/inactive pill |
| `TableIconActions` | View / edit / add (green) / delete (red) icon row |
| `FormField` | shadcn `Field` / `FieldLabel` + `Input`; required asterisk, placeholder pattern (unchanged when invalid); when `invalid`, `FieldError` with `error.required` under the control + reserved `min-h-5` slot; clear via `onClearInvalid` on change; `readOnly` locks the default `Input` (`readOnly` + `disabled`) so callers do not fork a second field / children override; shared `Input` defaults `maxLength` **100** on text-like types (`DEFAULT_INPUT_MAX_LENGTH`, overridable per field) |
| `BreadcrumbNav` | shadcn `Breadcrumb*` + `@/i18n/navigation` `Link` |
| `CrudPaginationBar` | shadcn `PaginationContent` / `PaginationItem` / `PaginationEllipsis` + page-size `Select` |
| `CrudPageHeader` | Title + description + actions slot |
| `CrudDeleteConfirmDialog` | Controlled delete confirm (`crud.delete` / `crud.confirmDelete` / `crud.cancel`); destructive confirm button; optional title/description overrides |
| `CrudFormSheet` | Compound right `Sheet` for CRUD create/edit: `CrudFormSheet` + `CrudFormSheetHeader` / `Body` / `Footer` (bordered header/footer, scroll body, dismiss + save); form element stays in the route |
| `FormCard` | shadcn `Card` with form panel surface (border, shadow); re-exports header/content subcomponents |
| `LocaleThemeToolbar` | Header locale + light/dark icon buttons (admin shell); Storybook **Molecules/LocaleThemeToolbar** |
| `RemoteComboboxField` | API-backed searchable combobox (debounced list `search`, pinned/resolved selected label); Storybook **Molecules/RemoteComboboxField** — see [combobox.mdc](../../.cursor/rules/combobox.mdc) |
| `CrudListPageSkeleton` | Full admin list chrome for route `loading.tsx` (header, toolbar, table, pager placeholders); props for column count, grip column, extra filter slots — [skeleton.mdc](../../.cursor/rules/skeleton.mdc) |
| `CrudListTableSkeleton` | Skeleton rows inside `<TableBody>` while client list fetch runs (header/toolbar stay real; refetch does not full-page flash) |
| `CrudTabbedFormPageSkeleton` | Supplier-style tabbed full-page form (cards + fixed footer) for form `loading.tsx` and edit initial load |
| `CrudNestedSortableList` | Card-style nested sortable rows on tabbed forms (grip, delete confirm, optional API reorder) — **Molecules/CrudNestedSortableList** |
| `LoginFormSkeleton` | Admin login card placeholder for `(auth)/login/loading.tsx` |
| `ImageUploadField` | Image upload with preview (single logo or multi-image gallery + DnD reorder); default **`uploadTiming="deferred"`** — local blob preview until save, then `uploadSystemFile` via BFF → `POST /system/files`; Storybook uses **`uploadTiming="immediate"`**; state type `ImageUploadItem` (`remote` \| `local`) in [`lib/system-file-api.ts`](../../frontend/lib/system-file-api.ts); setting bank/sale-channel logos upload on save via `resolveSettingLogoFileId` |

**App chrome** (files under `components/` root, Storybook titles under **Molecules/**): `LocaleSwitch` (th/en segmented control — **Molecules/LocaleSwitch**), `ThemeModeSwitch` (light/dark/system — **Molecules/ThemeModeSwitch**). `ThemeDocumentSync` and `theme-provider` are layout-only — no separate stories.

Shared list pagination logic must not be duplicated — use `CrudPaginationBar` + `buildPageItems`.

**Admin loading:** Every route under `app/[locale]/(admin)/` has co-located `loading.tsx` (default backoffice list skeleton; overrides for login, tabbed forms, geo/permission toolbars). When page layout changes, update the matching skeleton molecule in the same change — [skeleton.mdc](../../.cursor/rules/skeleton.mdc).

**List helpers (lib):** [`format-datetime.ts`](../../frontend/lib/format-datetime.ts) (display dates per [dates.mdc](../../.cursor/rules/dates.mdc)); [`crud-list-rows.ts`](../../frontend/lib/crud-list-rows.ts) (tree flatten, `sortBySortOrderThenId` / `withSortOrderSteps100`, drag reorder); [`hooks/use-crud-list-query.ts`](../../frontend/hooks/use-crud-list-query.ts) (shared debounced search, status filter, pagination, column sort, DnD-disable-when-filtered for flat CRUD lists); [`hooks/use-crud-sortable-reorder.ts`](../../frontend/hooks/use-crud-sortable-reorder.ts) (shared flat-list / card-list `onDragEnd` + `sortableEpoch`); [`CrudNestedSortableList`](../../frontend/components/molecules/crud-nested-sortable-list.tsx) (tabbed-form nested card sublists — supplier contacts/banks); [`bff-nested-mutate.ts`](../../frontend/lib/bff-nested-mutate.ts) (parent-scoped BFF POST/PATCH/DELETE proxy — supplier contacts/banks today); [`hooks/use-remote-combobox-options.ts`](../../frontend/hooks/use-remote-combobox-options.ts) + [`lib/system-geo-combobox.ts`](../../frontend/lib/system-geo-combobox.ts) for paginated combobox option loading ([combobox.mdc](../../.cursor/rules/combobox.mdc)). **Cross-resource toolbar / FK pickers:** use scoped `GET …/filters` on the **page resource** (same permission as the list), not the sibling full list API — e.g. [`fetchAdminUserRoleFilters`](../../frontend/lib/admin-user-api.ts), [`fetchSystemGeoFilters`](../../frontend/lib/system-geo-api.ts) + `loadGeoFilterComboboxOptions` (mirrors [`fetchSystemPermissionFilters`](../../frontend/lib/system-permission-api.ts)). **BFF / browser API:** [`bff-system-crud.ts`](../../frontend/lib/bff-system-crud.ts) (authed proxy CRUD handlers); [`bff-crud-client.ts`](../../frontend/lib/bff-crud-client.ts) (`authFetch` list/create/patch/delete/reorder for system modules). **Composed CRUD routes:** [`system/menu`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/menu/system-menu-list.tsx) (tree DnD + `move` API); [`system/language`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/language/system-language-list.tsx) — flat `system_language` list via [`lib/system-language-api.ts`](../../frontend/lib/system-language-api.ts) → BFF [`/api/v1/auth/proxy/system/languages`](../../frontend/app/api/v1/auth/proxy/system/languages/route.ts) → `GET /v1/system/languages`; grip reorder → `PATCH …/reorder`; create/edit/delete sheet + inline `is_active` / exclusive `is_default` switches. **Address geo:** [`system/address/*`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/country/page.tsx) — shared [`system-geo-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/_shared/system-geo-list.tsx) + [`lib/system-geo-api.ts`](../../frontend/lib/system-geo-api.ts) → BFF `/api/v1/auth/proxy/system/{countries|provinces|districts|sub-districts}`; th/en names in [`system-geo-edit-sheet.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/_shared/system-geo-edit-sheet.tsx); required parent (country/province/district) via [`RemoteComboboxField`](../../frontend/components/molecules/remote-combobox-field.tsx) + [`system-geo-combobox.ts`](../../frontend/lib/system-geo-combobox.ts) with `form.placeholder.select`; required validation on save uses `toast.error` with placeholder copy (first invalid field) + invalid field chrome, no under-field text (same as admin login); status row shows visible `col.status` label + `StatusSwitchField`; province/district/sub-district cascade **toolbar** filters use the same remote combobox with `crud.filter.select` (same pattern as system permissions); DnD on province/district/sub-district — reorder API is sibling-scoped (`createParentKey` / same country or province or district); cross-group drag shows `crud.reorder.siblingOnly` toast and does not call the API (design `crud.dragSiblingOnly` parity). Menu list: server-driven via [`lib/system-menu-api.ts`](../../frontend/lib/system-menu-api.ts); [`admin-menu-mock.ts`](../../frontend/lib/admin-menu-mock.ts) remains for seed parity and tree helpers — not runtime sidebar. **Supplier:** [`supplier`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/page.tsx) — admin routes `/admin/supplier`, `/admin/supplier/new`, `/admin/supplier/[id]`; full-page list + tabbed form (not sheet) via [`lib/supplier-user-api.ts`](../../frontend/lib/supplier-user-api.ts) → BFF `/api/v1/auth/proxy/supplier/users`; permissions `supplier.supplier_user`; Contacts tab uses sortable **item sublist** ([`supplier-contact-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/_shared/supplier-contact-list.tsx): grip + avatar initials + mail/tel meta + edit/delete; `@dnd-kit` — edit mode persists via `PATCH …/contacts/reorder`, create mode reorders local array before submit); Financial tab **bank accounts** use the same sublist pattern ([`supplier-bank-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/_shared/supplier-bank-list.tsx) — resolved setting bank label, default badge, `PATCH …/banks/reorder` on edit). create/edit use a **fixed bottom** save bar (`btn.back`/`btn.cancel` + `btn.save`), not header actions — bar uses `fixed bottom-0 right-0` with **`left`** inset (not `inset-x-0` + padding): `useSidebar()` → `left-[var(--sidebar-width)]` when desktop and sidebar open, else `left-0` (matches offcanvas gap). General-tab info cards match design field order (prefix + company → tax OTP → branch → address → geo row → tel/email); wrap `RemoteComboboxField` with visible `FieldLabel`; delivery card omits prefix/tax/branch/contact fields.

### Drag-and-drop (row reorder)

- **Production:** [`@dnd-kit/react`](https://dndkit.com/react/quickstart/) with `DragDropProvider`, `useSortable` (`@dnd-kit/react/sortable`), and `move()` from `@dnd-kit/helpers` on `onDragEnd`.
- **Design mockups:** HTML5 `draggable` in `design/` only — do not port that mechanism to `frontend/`.
- **When to enable:** tables with a `sort_order` column only ([`.cursor/rules/tables.mdc`](../../.cursor/rules/tables.mdc)); grip column (Lucide `GripVertical`) on the handle; disable **all** sorting (column headers + DnD) while **any** list filter is active (search query or status ≠ all), same as disabling DnD during column header sort.
- **Scope:** wrap each sortable list/table in its own `DragDropProvider` (not the locale layout).
- **Storybook baseline:** **Design system/DnD Sortable** — [`stories/dnd-kit-sortable.stories.tsx`](../../frontend/stories/dnd-kit-sortable.stories.tsx).
- **Tree lists (`tree_path`):** System menu list uses **Notion-style drop zones** on each row (top/bottom 25% = sibling before/after, middle 50% = nest as child) via [`resolveTreeDropZone`](../../frontend/lib/crud-list-rows.ts) + live badges (`crud.reorder.dropSibling` / `crud.reorder.dropChild`). Persist with [`moveAdminMenuRowByTreeDrop`](../../frontend/lib/admin-menu-mock.ts) (reparent + sibling `sort_order`, `tree_path` rebuild). Rejects drops onto the dragged node’s subtree (`isTreePathDescendant`) → `crud.reorder.intoSubtree`; remount sortable rows via `TableBody` `key` (`sortableEpoch`) on failed drag so UI matches `fullSorted`. Other tree tables may still use [`reorderFlatSortOrder`](../../frontend/lib/crud-list-rows.ts) for sibling-only reorder until they adopt the same pattern.
- **Product attributes** ([`product-attribute-list-table.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-attribute-list-table.tsx)): category + car use tree drop zones → `PATCH …/move`; **brand** uses flat `sortableIndicesFromSource` → `reorderProductAttributes` / `PATCH …/brands/reorder` (no drop-hint badges).

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
| `--color-success` / `--success` (shadcn bridge) | Solid green for filled controls — same as `--color-action-add` (`#16a34a` light); `#22c55e` dark |
| `--color-success-foreground` | Text on solid success (white light; white dark) |
| `--color-success-*` (bg/fg/border) | `.wh-badge--active` / `StatusBadge` active — `bg-warehouse-success-bg`, `text-warehouse-success-fg` |
| `--color-status-active-*` / `--color-status-inactive-*` | `.crud-badge--*`; inactive badge — `bg-warehouse-status-inactive-bg`, `text-warehouse-status-inactive-fg` |
| `--color-action-add` | `#16a34a` — crud-add / green actions |
| `--color-action-delete` | `#dc2626` — crud-delete |
| `--color-warning` / `--warning` | `#d97706` light / `#fbbf24` dark — toast warning, `Button` `warning` variant |
| `--color-warning-foreground` | White on warning (light); `#0f172a` on amber (dark) |
| `--color-switch-checked` | `rgb(34 197 94)` — shadcn `Switch` / design `.crud-switch` track when on |
| `--color-row-expanded` | Expanded warehouse row background |
| `--color-nav-active-bg` | Sidebar active item |
| `--color-table-head-bg` | CRUD table header row (`.data-table th` tint); Tailwind `bg-warehouse-table-head` |
| `--radius-table-wrap` | `0.75rem` — table + pagination chrome |
| `--shadow-zone-card` | Inner zone cards in expanded row |

Tailwind theme aliases: `--color-warehouse-*` in `@theme` (e.g. `bg-warehouse-border`, `text-warehouse-action-add`); semantic solids `bg-success`, `bg-warning`, `text-success-foreground`, `text-warning-foreground` via `--success` / `--warning` bridge.

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

- **Host:** `<Toaster />` from `@/components/ui/sonner` once in `app/[locale]/layout.tsx`. Root `<html>` / `<body>`, `NextIntlClientProvider`, `ThemeProvider`, and `globals.css` import live in the same `[locale]/layout.tsx` (required so `next/root-params` exposes `[locale]`). Client `ThemeProvider` applies theme after hydration (no blocking init script).
- **API:** `import { toast } from "sonner"` — pass translated strings at call sites (`toast.success(tCrud("toast.saved"))`).
- **Styling:** overrides in `app/globals.css` on `[data-sonner-toast]` (left accent border, design shadow); Lucide icons in `sonner.tsx`.
- **Rule:** every mutation (POST/PATCH/DELETE) shows success or error toast — no silent mutations.

Storybook: **UI/Toaster** (`components/ui/sonner.stories.tsx`).

## i18n

- Locales: `th` (default), `en`
- Routes: ภาษาไทย (default) ที่ **`/`** ไม่มี `/th`; อังกฤษที่ **`/en`…**
- Messages: per-locale JSON fragments under `frontend/messages/{th,en}/`, merged by [`load-messages.ts`](../../frontend/messages/load-messages.ts) (same object for app + Storybook)
- Config: `frontend/i18n/routing.ts`, `request.ts`, `navigation.ts`
- Server locale: `i18n/request.ts` reads `[locale]` via Next.js `next/root-params` (static rendering + `getTranslations` / server `NextIntlClientProvider`); do not use deprecated `setRequestLocale`
- Layout: server `NextIntlClientProvider` (no manual `getMessages` / `locale` props — filled from `i18n/request.ts` per [App Router getting started](https://next-intl.dev/docs/getting-started/app-router)); locale routing per [routing setup](https://next-intl.dev/docs/routing/setup)
- Client navigation: `@/i18n/navigation` (`Link`, `useRouter`, `usePathname`)
- Header: `LocaleSwitch` (ไทย / EN) + `ThemeModeSwitch`

### Message fragments (by file)

| File | Namespaces |
|------|------------|
| `app.json` | `app`, `home` |
| `chrome.json` | `nav`, `lang`, `theme`, `toast` (demo keys for Storybook) |
| `form.json` | `form` — `field.*`, placeholders, password a11y; **`search.placeholder`** (same file, `search` namespace) |
| `crud.json` | `crud` — nested: `btn`, `toast`, `deleteConfirm`, `table`, `pagination`, `sort`, `filter`, `reorder` |
| `col.json` | `col` — shared column/field labels |
| `error.json` | `error` |
| `action.json` | `action` — short icon aria verbs |
| `page-auth.json` | `page.login` — admin sign-in screen |
| `page-system.json` | `page.adminMenu`, `page.adminRole`, `page.adminUser`, geo/system page headers |
| `user.json` | `userType.*`, `userStatus.*`, `rolePerm.*` |

Sidebar / breadcrumb labels live in [`admin-menu-mock.ts`](../../frontend/lib/admin-menu-mock.ts) as mock `labels: { th, en }` until `admin_menu` API returns display names — not in `messages/`.

Storybook stories reuse production keys where applicable (e.g. `col.name`, `page.adminMenu.title`).

Add keys when a route or nav node ships — no unused placeholders. Port copy from `design/js/i18n/` (`page.foo` + `page.foo.desc` flat keys → nested `page.foo.title` / `page.foo.desc`).

### Page copy shape

Each screen under `page.<screenId>`:

- `title` — page header (and breadcrumb on wired routes via `admin-menu-mock.ts`)
- `desc` — optional list header description
- `add` — optional primary create CTA when phrasing is not `crud.create` + title

Example: `useTranslations("page.adminMenu")` → `t("title")`, `t("desc")`, `t("add")`.

Shared reuse: nested `crud.btn.*` / `crud.toast.*`, `col.*`, `form.field.*`, `form.placeholder.input`, `search.placeholder` — see [i18n-frontend.mdc](../../.cursor/rules/i18n-frontend.mdc) (design flat `crud.create` ≠ `tCrud("btn.create")`) and [forms.mdc](../../.cursor/rules/forms.mdc).

Port more keys from `design/js/i18n/` into the matching fragment as pages ship.

### Admin backoffice shell

| Item | Detail |
|------|--------|
| Route group | `app/[locale]/(admin)/admin/(backoffice)/` |
| Layout | [`(backoffice)/layout.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/layout.tsx) → `AdminBackofficeShell` |
| Design source | [`design/js/components/layout.js`](../../design/js/components/layout.js) |
| Wired routes | `/admin/system/menu`, `/admin/system/permission`, `/admin/admin/roles`, `/admin/admin/users` (lists + sheets via BFF → Go `/admin/*` and permission matrix → `GET /system/menus/permission-matrix`); **setting:** `/admin/setting/{bank,vat,payment-method,sale-channel,code,claim-reason,prefix}` → BFF [`app/api/v1/auth/proxy/setting/*`](../../frontend/app/api/v1/auth/proxy/setting/) → Go `/api/v1/setting/*`; [`lib/setting-api.ts`](../../frontend/lib/setting-api.ts), shared lists [`setting/_shared/`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/setting/_shared/) — **payment method** / **claim reason** ([`setting-lang-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/setting/_shared/setting-lang-list.tsx)): boolean column filters via [`BoolColumnFilterField`](../../frontend/components/molecules/bool-column-filter-field.tsx) + `crud.filter.select` (`is_sale`/`is_purchase`, `is_claim`/`is_return`, `is_person`/`is_company` on prefix); inline `StatusSwitchField` on those columns + `is_active`; DnD off while bool filters active except prefix audience filters that define reorder scope (person/company “yes” only); prefix reorder uses that filter scope or else scope from the dragged row (same person/company group only); prefix list groups person rows then company rows by default sort; claim/prefix audience validation toasts and sheet copy use `error.claimReasonType` / `error.prefixAudienceType` (not raw API “validation failed”) — **VAT** (`setting-vat-list` + `setting-vat-edit-sheet`): singleton table, edit-only, status switch in table + sheet (`is_active`), no search/pager/create/delete; **location:** `/admin/location/locations` (list CRUD + DnD) and `/admin/location/[id]` (detail stub) → BFF [`app/api/v1/auth/proxy/location/locations/*`](../../frontend/app/api/v1/auth/proxy/location/locations/) → Go `/api/v1/location/locations`; [`lib/location-api.ts`](../../frontend/lib/location-api.ts), [`location/_shared/location-lang-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/location/_shared/location-lang-list.tsx); after create/update/delete/status/reorder call `router.refresh()` so layout re-fetches active rows for sidebar — **warehouse:** `/admin/warehouse/list` (expandable warehouse + zone preview, CRUD sheet) and `/admin/warehouse/list/view?id=` (management tree + stats) → BFF [`app/api/v1/auth/proxy/warehouse/lists/*`](../../frontend/app/api/v1/auth/proxy/warehouse/lists/) → Go `/api/v1/warehouse/lists`; [`lib/warehouse-api.ts`](../../frontend/lib/warehouse-api.ts), [`warehouse/_shared/`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/warehouse/_shared/); sidebar **การจัดการ** uses `is_dialog` from nav + warehouse picker in [`AdminBackofficeShell`](../../frontend/components/organisms/admin-backoffice-shell.tsx) — **product attributes:** `/admin/product/{category,brand,car}` split-pane tree + form → BFF [`app/api/v1/auth/proxy/product/{categories,brands,cars}/*`](../../frontend/app/api/v1/auth/proxy/product/categories/route.ts) → Go `/api/v1/product/*`; [`lib/product-attribute-api.ts`](../../frontend/lib/product-attribute-api.ts), [`product/_shared/product-attribute-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-attribute-page.tsx) — category form: tree-indented parent combobox ([`lib/product-category-combobox.ts`](../../frontend/lib/product-category-combobox.ts), same NBSP indent as system menu) + multi brand [`RemoteMultiComboboxField`](../../frontend/components/molecules/remote-multi-combobox-field.tsx) ([`lib/product-brand-combobox.ts`](../../frontend/lib/product-brand-combobox.ts)) |
| Nav | **`GET /api/v1/auth/nav`** (server layout) → [`lib/admin-nav-api.ts`](../../frontend/lib/admin-nav-api.ts) maps API tree to sidebar nodes (`is_dialog` on dialog leaves such as warehouse Management); **location:** layout also `GET /v1/location/locations?is_active=true&limit=100` when `location.location_location.view`, then [`mergeLocationNavNodes`](../../frontend/lib/admin-nav-api.ts) appends `/admin/location/{id}` under map-pin (menu id 23) — not stored in `system_menu`. Breadcrumbs from tree walk by pathname. [`lib/admin-menu-mock.ts`](../../frontend/lib/admin-menu-mock.ts) remains for Storybook, seed generator, and tree helpers — not runtime menu list data. |
| System menus API | Browser → [`app/api/v1/auth/proxy/system/menus/*`](../../frontend/app/api/v1/auth/proxy/system/menus/) (BFF under auth prefix so gateway always hits Next) → Go `GET/PATCH /api/v1/system/menus`; client helpers in [`lib/system-menu-api.ts`](../../frontend/lib/system-menu-api.ts). Alternate path [`app/api/v1/system/menus/*`](../../frontend/app/api/v1/system/menus/) when nginx routes `/api/v1/system/` to frontend. Create/delete UI commented out on menu page; edit, status toggle, and drag-move are wired. |
| System permissions API | Browser → [`app/api/v1/auth/proxy/system/permissions/*`](../../frontend/app/api/v1/auth/proxy/system/permissions/) (list + [`filters`](../../frontend/app/api/v1/auth/proxy/system/permissions/filters/route.ts)) → Go `GET/PATCH /api/v1/system/permissions` + `GET …/filters`; [`lib/system-permission-api.ts`](../../frontend/lib/system-permission-api.ts). List: [`system-permission-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/permission/system-permission-list.tsx) — module/type/action filters as [`Combobox`](../../frontend/components/ui/combobox.tsx) with options from `fetchSystemPermissionFilters`; placeholder `crud.filter.select` (`เลือกกรอง{label}`); clear via input X; search, status filter, pagination, column sort (disabled while any filter active); action labels via `permissionActionLabel`; no create/edit/delete actions. |
| Admin roles / users API | Browser → [`app/api/v1/auth/proxy/admin/roles/*`](../../frontend/app/api/v1/auth/proxy/admin/roles/), [`…/users/*`](../../frontend/app/api/v1/auth/proxy/admin/users/) (+ [`…/users/filters`](../../frontend/app/api/v1/auth/proxy/admin/users/filters/route.ts) for role combobox under `admin.admin_user.view` only) → Go `GET/POST/PATCH/DELETE /api/v1/admin/roles|users`, `GET /admin/users/filters`; role sheet matrix → permission-matrix; clients [`lib/admin-role-api.ts`](../../frontend/lib/admin-role-api.ts), [`lib/admin-user-api.ts`](../../frontend/lib/admin-user-api.ts), [`lib/admin-user-role-combobox.ts`](../../frontend/lib/admin-user-role-combobox.ts) (user list/form), [`lib/admin-role-combobox.ts`](../../frontend/lib/admin-role-combobox.ts) (role CRUD only), [`lib/admin-role-permission-matrix-api.ts`](../../frontend/lib/admin-role-permission-matrix-api.ts); UI [`AdminRolePermissionMatrix`](../../frontend/components/molecules/admin-role-permission-matrix.tsx); actor guard via [`lib/admin-backoffice-actor-context.tsx`](../../frontend/lib/admin-backoffice-actor-context.tsx). |
| Permissions (UI) | Layout SSR → `GET /v1/auth/permissions` → [`AdminBackofficeActorProvider`](../../frontend/lib/admin-backoffice-actor-context.tsx) + [`useResourcePermissions`](../../frontend/lib/admin-backoffice-actor-context.tsx) / [`lib/admin-permissions.ts`](../../frontend/lib/admin-permissions.ts). Gates Add / row edit-delete icons / status switches / DnD by `{module}.{type}.{action}`; superadmin bypass. **View-only** (`view` without `update`): actions column shows the view icon ([`tableIconActionsFromResource`](../../frontend/lib/admin-permissions.ts)); row handler opens the same edit sheet read-only (`canSave={false}`). List status columns keep [`StatusSwitchField`](../../frontend/components/molecules/status-switch-field.tsx) visible with `disabled={!update}` (e.g. geo, language, [`supplier-user-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/_shared/supplier-user-list.tsx)). Address geo [`system-geo-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/_shared/system-geo-list.tsx): when `!perm.view`, skip list/filter API calls and show `error.forbidden` in the table (avoids 403 toasts on direct URL). Manual QA: dev seed logins in [`document/knowledge/backend.md`](../knowledge/backend.md). |
| Cross-module pickers | Use parent **`/filters`** APIs (admin-users / geo pattern) so comboboxes stay under the **page module’s** `view` — do not call foreign list CRUD routes. **Product category** brands: BFF [`…/product/categories/filters`](../../frontend/app/api/v1/auth/proxy/product/categories/filters/route.ts) + [`fetchCategoryBrandFilters`](../../frontend/lib/product-filters-api.ts) / [`loadProductBrandComboboxOptions`](../../frontend/lib/product-brand-combobox.ts) (`source: "categoryForm"`). **Product list** toolbar: [`…/product/items/filters`](../../frontend/app/api/v1/auth/proxy/product/items/filters/route.ts) + [`loadProductItemBrowseCategoryComboboxOptions`](../../frontend/lib/product-category-combobox.ts) / brand `source: "itemBrowse"`. **Product list form**: [`…/product/lists/filters`](../../frontend/app/api/v1/auth/proxy/product/lists/filters/route.ts) + [`fetchProductListFilters`](../../frontend/lib/product-filters-api.ts) (categories, brands, suppliers, sale_channels, warehouse_bins, cars in [`product-list-form-cars.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-cars.tsx)). **Supplier form** prefix/bank: [`…/supplier/users/filters`](../../frontend/app/api/v1/auth/proxy/supplier/users/filters/route.ts) + [`supplier-user-filters-combobox.ts`](../../frontend/lib/supplier-user-filters-combobox.ts). [`useResourcePermissions`](../../frontend/lib/admin-backoffice-actor-context.tsx) gates **own-module** create/update/delete only, not picker visibility. |
| Session | httpOnly JWT cookies via BFF [`app/api/v1/auth/*`](../../frontend/app/api/v1/auth/); short-lived access + 7d refresh. **Silent refresh:** BFF [`proxyAuthedBackendJson`](../../frontend/lib/bff-backend.ts) and [`getValidAccessToken`](../../frontend/lib/auth-server.ts) (Route Handlers only) call Go refresh when access is missing or backend returns 401 (deduped in-flight refresh). Browser CRUD helpers use [`authFetch`](../../frontend/lib/auth-client.ts) → `POST /api/v1/auth/refresh` + one retry; on failure → logout + redirect login (callback URL via [`lib/locale-path.ts`](../../frontend/lib/locale-path.ts) `stripLocalePrefix` / `loginPathWithCallback`). **SSR backoffice:** layout reads cookies only; missing access + refresh present → [`GET /api/v1/auth/refresh-redirect`](../../frontend/app/api/v1/auth/refresh-redirect/route.ts) (sets cookies, sets short-lived `warehouse_ssr_refresh_tried`, returns via `x-warehouse-admin-path` from middleware); if `/auth/me` or `/auth/nav` still fail after one refresh round → [`GET /api/v1/auth/clear-session`](../../frontend/app/api/v1/auth/clear-session/route.ts) then login (clears stale cookies — avoids login ↔ landing loops). Refresh failure on `refresh-redirect` clears cookies on the login redirect. Footer user from SSR `/auth/me`. Agent rule: [`.cursor/rules/auth-redirects.mdc`](../../.cursor/rules/auth-redirects.mdc). |
| Guard | [`middleware.ts`](../../frontend/middleware.ts) — `/admin/*` (except login) requires **access or refresh** cookie; neither → `/admin/login`; login page auto-redirects to `warehouse_landing` **only when access cookie is present** (refresh-only does not skip login). If `warehouse_ssr_refresh_tried=1` on login, clear session cookies and show login (no landing bounce). Sets request header `x-warehouse-admin-path` for SSR refresh return URL. Locale stripping / redirect prefix: [`lib/locale-path.ts`](../../frontend/lib/locale-path.ts). |
| Phase checklist | [`document/checklist/frontend/phase-frontend-admin-backoffice-shell.md`](../checklist/frontend/phase-frontend-admin-backoffice-shell.md) |

### Product list (item browse + aggregate form)

| Item | Detail |
|------|--------|
| Design | [`design/pages/product-list.html`](../../design/pages/product-list.html), [`product-list-form.html`](../../design/pages/product-list-form.html) |
| Routes | `/admin/product/list` (full-width table), `/admin/product/list/new`, `/admin/product/list/[id]` + `loading.tsx` |
| BFF / API | [`lib/bff-product-list-handlers.ts`](../../frontend/lib/bff-product-list-handlers.ts) → [`app/api/v1/auth/proxy/product/items/`](../../frontend/app/api/v1/auth/proxy/product/items/) (+ [`items/filters`](../../frontend/app/api/v1/auth/proxy/product/items/filters/route.ts)), [`…/lists/`](../../frontend/app/api/v1/auth/proxy/product/lists/) (+ [`lists/filters`](../../frontend/app/api/v1/auth/proxy/product/lists/filters/route.ts)); clients [`lib/product-list-api.ts`](../../frontend/lib/product-list-api.ts), [`lib/product-filters-api.ts`](../../frontend/lib/product-filters-api.ts) |
| List UI | [`product-list-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-page.tsx), [`product-list-table.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-table.tsx), [`product-list-selection-bar.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-selection-bar.tsx) (sticky bulk bar when rows selected: delete, `PATCH is_stopped` open/close sales); row checkboxes when user has delete or update; product badges include red **`salesStopped`** when `is_stopped`; car/warehouse modals ([`product-list-modals.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-modals.tsx) — close via X; footer **`viewMoreDetails`** link to `/admin/product/car` when `product.product_car.view`, or `/admin/warehouse/list` when `warehouse.warehouse_list.view`); filters: search, category/brand combobox, status + `is_new` |
| Form UI | Tabbed [`product-list-form.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form.tsx): data (info, details, codes, partners, cars), pricing (variants, channel prices from active sale channels, bin placement), history stub UI; sidebar status/note on data tab only; per-variant save → `PATCH /product/items/:id` when editing; fixed bottom save bar matches supplier tabbed form (sidebar `left` inset, `max-w-crud-page`, `btn.back`/`btn.cancel` + `btn.save`) — see **Supplier** row above |
| Cars sub-form | [`product-list-form-cars.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-cars.tsx) — paginated fitment table + [`ProductCarCascadeDialog`](../../frontend/components/molecules/product-car-cascade-dialog.tsx) (brand → model → engine, year/gear); catalog via [`fetchAllActiveCars`](../../frontend/lib/product-car-cascade.ts) |
| Category pick (list form) | Readonly trigger + [`ProductCategoryCascadeDialog`](../../frontend/components/molecules/product-category-cascade-dialog.tsx) + [`lib/product-category-cascade.ts`](../../frontend/lib/product-category-cascade.ts) (multi-column cascade + search; loads active categories via `fetchProductAttributes("categories")`). Toolbar/browse still use [`lib/product-category-combobox.ts`](../../frontend/lib/product-category-combobox.ts) `/filters` comboboxes. |
| i18n | [`messages/{th,en}/product-list.json`](../../frontend/messages/en/product-list.json) (`productList`, `productListForm`); page titles in `page-product.json` |
| RBAC | Primary `product.product_list`; cross-module pickers via **Cross-module pickers** `/filters` row above |
| Phase checklist | [`document/checklist/frontend/phase-frontend-product-list.md`](../checklist/frontend/phase-frontend-product-list.md) |

### Login route (admin)

| Item | Detail |
|------|--------|
| Path | `/admin/login` (default locale `th` has no `/th` prefix) |
| Design source | [`design/pages/login.html`](../../design/pages/login.html) |
| Files | [`(auth)/layout.tsx`](../../frontend/app/[locale]/(admin)/admin/(auth)/layout.tsx) (split shell + brand aside), [`login/page.tsx`](../../frontend/app/[locale]/(admin)/admin/(auth)/login/page.tsx) + `login-form.tsx` |
| Compose | `(auth)/layout`: toolbar, brand panel at `lg`; login page: `FormCard`, `FormField`, `InputGroup` + Lucide `User` / `Lock`; password visibility on shared `Input` |
| Tokens | `max-w-form` in `app/globals.css`; mobile radial wash uses `--color-primary`; brand gradient uses `primary` token stops |
| API | `POST /api/v1/auth/login` (BFF) → Go `POST /api/v1/auth/login`; success `router.replace(landing_path)` from response |
| Phase | Wired to backend JWT (see [`document/knowledge/backend.md`](../knowledge/backend.md) Auth + `/auth/nav`) |
| Required empty submit | `toast.error` with `form.placeholder.input` copy (first invalid field); both fields may show invalid chrome; no under-field text |
| Entry | Home stack page links via `home.adminLogin` → `/admin/login` |

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
| Theme | `ThemeProvider` in `app/[locale]/layout.tsx`, `storageKey` `warehouse-design-theme`, `data-theme` on `<html>` |
| Icons | lucide-react |
| Components | shadcn/ui → `components/ui/` |
| Drag and drop | `@dnd-kit/react` + `@dnd-kit/helpers` — list/table reorder (modern API; not legacy `@dnd-kit/core`) |
| Design tokens | `app/globals.css` only |
| Storybook | `@storybook/nextjs` (Webpack), v10.6 |

## Storybook

- Global styles: `app/globals.css`; `ThemeProvider` + **`withIntl`** ([`.storybook/decorators/intl.tsx`](../../frontend/.storybook/decorators/intl.tsx)) + **`StorybookThemeBridge`** ([`.storybook/decorators/theme-bridge.tsx`](../../frontend/.storybook/decorators/theme-bridge.tsx)) in `.storybook/preview.tsx` — toolbar **locale** `th` / `en`; built-in **backgrounds** Light/Dark toolbar drives `next-themes` (not just canvas paint)
- Dev: `make frontend-storybook` → [http://localhost:6006](http://localhost:6006)
- Story globs (`.storybook/main.ts`): `components/**/*.stories.tsx` and `stories/**/*.stories.tsx`
- Titles: `components/ui/` → **UI/**; `components/molecules/` → **Molecules/**; `stories/component-catalog.stories.tsx` → **Design system/Overview** (theme swatches including **success** / **warning**, Eva-style primitive matrices in `component-catalog-overview.tsx`, then all exported stories via `composeStories`); `stories/dnd-kit-sortable.stories.tsx` → **Design system/DnD Sortable**
- **Organisms/** — `AdminBackofficeShell`; **Molecules/** also lists app chrome (`LocaleSwitch`, `ThemeModeSwitch`, `LocaleThemeToolbar`); **Pages/** stories still deferred
- **Same change as components:** every new visible export under `frontend/components/**` must ship with co-located `*.stories.tsx` in that change — see [`.cursor/rules/storybook.mdc`](../../.cursor/rules/storybook.mdc) **Mandatory stories (same change)**

### Story typing conventions

- **Args required with custom `render`:** Storybook 10 + `StoryObj<typeof meta>` treats `args` as required when the component has required props. Every story that uses a custom `render` function must still include a stub `args` object with no-op handlers and minimal prop values — the `render` function owns interactive state but `args` satisfies the type. Pattern already in [`breadcrumb-nav.stories.tsx`](../../frontend/components/molecules/breadcrumb-nav.stories.tsx).
- **Generic components:** Storybook's `Meta<typeof Component>` infers `unknown` args for generic components (e.g. `DataTable<TData, TValue>`). Fix: cast `component` to a concrete prop signature — `DataTable as (props: DataTableProps<Warehouse, unknown>) => JSX.Element` — so `StoryObj` resolves the right args types. See [`data-table.stories.tsx`](../../frontend/components/ui/data-table.stories.tsx).
- **Union-prop components:** When a component's props form a discriminated union (e.g. `DatePicker` with `mode="single" | "range"`), `Meta<typeof DatePicker>` collapses to `args: never`. Fix: import and use the concrete single-mode type — `Meta<DatePickerSingleProps>` — so all shared props are optional; range stories use `render` to override.
- **Catalog:** `component-catalog.stories.tsx` uses `composeStories` from `@storybook/nextjs` (not `@storybook/react`), passing **`.storybook/preview`** as project annotations so nested stories inherit `parameters.nextjs.appDirectory` and Next.js router mocks. Each embedded story calls **`Story.load()`** before render (Storybook loaders initialize navigation mocks). `StoryModule` + webpack `require.context` types live in `component-catalog-load-stories.ts` with a local `RequireContext` interface.

### Component workflow (team agreement)

- Before new UI or design handoff: inventory `components/ui/`, `molecules/`, `organisms/`, and Storybook stories; compose existing pieces first.
- **New or changed component:** add or update co-located `*.stories.tsx` in the **same change** (mandatory for visible exports) — [`.cursor/rules/storybook.mdc`](../../.cursor/rules/storybook.mdc) **Mandatory stories (same change)**.
- **Route pages** (`frontend/app/[locale]/…`): implement shared UI to match Storybook (**UI/**, **Molecules/**, **Design system/Overview** catalog)—see [`.cursor/rules/storybook.mdc`](../../.cursor/rules/storybook.mdc) **Warehouse pages**; [forms.mdc](../../.cursor/rules/forms.mdc) / [tables.mdc](../../.cursor/rules/tables.mdc) apply on production forms and lists.
- **New shared component** (new file/export in those layers or `make frontend-shadcn-add`): requires explicit user approval every time — see [`.cursor/rules/design-system.mdc`](../../.cursor/rules/design-system.mdc).
- After any change under `frontend/components/**`: run `make frontend-storybook-build` before considering the task done — see [`.cursor/rules/storybook.mdc`](../../.cursor/rules/storybook.mdc).

## Docs

- Agent skill: `.cursor/skills/frontend/SKILL.md`
- Phase checklists: `document/checklist/frontend/phase-frontend-*.md`
