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
| `TableIconActions` | Row actions via [`ButtonIcon`](../../frontend/components/ui/button-icon.tsx) tones: **view** (green, same token as add), **edit** (primary blue), **add** (green), **delete** / **cancel** (red) |
| `FormField` | shadcn `Field` / `FieldLabel` + `Input`; required asterisk, placeholder pattern (unchanged when invalid); when `invalid`, `FieldError` with `error.required` under the control + reserved `min-h-5` slot; clear via `onClearInvalid` on change; `readOnly` locks the default `Input` (`readOnly` + `disabled`) so callers do not fork a second field / children override; shared `Input` defaults `maxLength` **100** on text-like types (`DEFAULT_INPUT_MAX_LENGTH`, overridable per field) |
| `BreadcrumbNav` | shadcn `Breadcrumb*` + `@/i18n/navigation` `Link` |
| `CrudPaginationBar` | shadcn `PaginationContent` / `PaginationItem` / `PaginationEllipsis` + page-size `Select` |
| `CrudPageHeader` | Title + description + actions slot |
| `CrudDeleteConfirmDialog` | Controlled delete confirm (`crud.delete` / `crud.confirmDelete` / `crud.cancel`); destructive confirm button; optional title/description overrides |
| `CrudFormSheet` | Compound right `Sheet` for CRUD create/edit: `CrudFormSheet` + `CrudFormSheetHeader` / `Body` / `Footer` (bordered header/footer, scroll body, dismiss + save); form element stays in the route |
| `FormCard` | shadcn `Card` with form panel surface (border, shadow); re-exports header/content subcomponents |
| `LocaleThemeToolbar` | Header locale + light/dark icon buttons (admin shell); Storybook **Molecules/LocaleThemeToolbar** |
| `RemoteComboboxField` | API-backed searchable combobox (debounced list `search`, pinned/resolved selected label, `filter={null}` so matching is server-side only); Storybook **Molecules/RemoteComboboxField** — see [combobox.mdc](../../.cursor/rules/combobox.mdc) |
| `WebsiteGeoFields` | Province → district → sub-district + postcode row for tabbed forms; inject `loaders` (member: [`loadMemberUserGeoComboboxOptions`](../../frontend/lib/member-user-filters-combobox.ts) on `GET …/member/users/filters` geo facets; supplier: [`loadGeoComboboxOptions`](../../frontend/lib/system-geo-combobox.ts)); Storybook **Molecules/WebsiteGeoFields** |
| `CrudListPageSkeleton` | Full admin list chrome for route `loading.tsx` (header, toolbar, table, pager placeholders); props: `tableColumns`, `showDragColumn`, `toolbarFilterSlots`, `showHeaderAction`, `showStatusFilter`, `showFixedFooter` — [skeleton.mdc](../../.cursor/rules/skeleton.mdc) |
| `CrudListTableSkeleton` | Skeleton rows inside `<TableBody>` while client list fetch runs (header/toolbar stay real; refetch does not full-page flash) |
| `CrudTabbedFormPageSkeleton` | Supplier-style tabbed full-page form (cards + fixed footer) for form `loading.tsx` and edit initial load |
| `CrudNestedSortableList` | Card-style nested sortable rows on tabbed forms (grip, delete confirm, optional API reorder) — **Molecules/CrudNestedSortableList** |
| `LoginFormSkeleton` | Admin login card placeholder for `(auth)/login/loading.tsx` |
| `ImageUploadField` | Image upload with preview (single logo or multi-image gallery + DnD reorder); default **`uploadTiming="deferred"`** — local blob preview until save, then `uploadSystemFile` via BFF → `POST /system/files`; Storybook uses **`uploadTiming="immediate"`**; state type `ImageUploadItem` (`remote` \| `local`) in [`lib/system-file-api.ts`](../../frontend/lib/system-file-api.ts); setting bank/sale-channel logos upload on save via `resolveSettingLogoFileId` |

**App chrome** (files under `components/` root, Storybook titles under **Molecules/**): `LocaleSwitch` (th/en segmented control — **Molecules/LocaleSwitch**), `ThemeModeSwitch` (light/dark/system — **Molecules/ThemeModeSwitch**). `ThemeDocumentSync` and `theme-provider` are layout-only — no separate stories.

Shared list pagination logic must not be duplicated — use `CrudPaginationBar` + `buildPageItems`.

**After delete (CRUD lists):** On successful row delete, always **refetch** list data from the API — do not rely on `setPage(1)` alone (page may already be `1`, so `useEffect` will not rerun). Prefer `await load()` / `loadList()` / `onReload()` when the list owns an explicit fetch function; for effect-driven lists keyed by `listFetchKey`, include `listRefreshKey` from [`useCrudListQuery`](../../frontend/hooks/use-crud-list-query.ts) in that key and call `refreshList()` after delete. Clamp pagination with [`pageAfterDelete`](../../frontend/lib/crud-pagination.ts) when removing the last row on a page. Refresh KPI/stats or expanded rows when the list page already does so on create/update.

**Admin loading:** Every route under `app/[locale]/(admin)/` has co-located `loading.tsx` (parent backoffice fallback: `CrudListPageSkeleton` without drag column). Overrides: login, tabbed forms, warehouse view ([`warehouse-view-page-skeleton.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/warehouse/_shared/warehouse-view-page-skeleton.tsx)), order compare footer, member tier cards. **Setting lang** routes use [`setting-list-skeleton.ts`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/setting/_shared/setting-list-skeleton.ts) (`settingLangListSkeletonProps`); **geo** routes use [`system-geo-skeleton.ts`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/_shared/system-geo-skeleton.ts). When page layout changes, update the matching skeleton in the same change — [skeleton.mdc](../../.cursor/rules/skeleton.mdc).

**List helpers (lib):** [`format-datetime.ts`](../../frontend/lib/format-datetime.ts) (display dates per [dates.mdc](../../.cursor/rules/dates.mdc)); [`crud-list-rows.ts`](../../frontend/lib/crud-list-rows.ts) (tree flatten, `sortBySortOrderThenId` / `withSortOrderSteps100`, drag reorder); [`hooks/use-crud-list-query.ts`](../../frontend/hooks/use-crud-list-query.ts) (shared debounced search, status filter, pagination, column sort, `listRefreshKey` / `refreshList()` for post-mutation refetch, DnD-disable-when-filtered for flat CRUD lists); [`crud-pagination.ts`](../../frontend/lib/crud-pagination.ts) (`buildPageItems`, `pageAfterDelete`); [`hooks/use-crud-sortable-reorder.ts`](../../frontend/hooks/use-crud-sortable-reorder.ts) (shared flat-list / card-list `onDragEnd` + `sortableEpoch`); [`CrudNestedSortableList`](../../frontend/components/molecules/crud-nested-sortable-list.tsx) (tabbed-form nested card sublists — supplier contacts/banks); [`bff-nested-mutate.ts`](../../frontend/lib/bff-nested-mutate.ts) (parent-scoped BFF POST/PATCH/DELETE proxy — supplier contacts/banks today); [`hooks/use-remote-combobox-options.ts`](../../frontend/hooks/use-remote-combobox-options.ts) + [`lib/system-geo-combobox.ts`](../../frontend/lib/system-geo-combobox.ts) for paginated combobox option loading ([combobox.mdc](../../.cursor/rules/combobox.mdc)). **Cross-resource toolbar / FK pickers:** use scoped `GET …/filters` on the **page resource** (same permission as the list), not the sibling full list API — e.g. [`fetchAdminUserRoleFilters`](../../frontend/lib/admin-user-api.ts), [`fetchSystemGeoFilters`](../../frontend/lib/system-geo-api.ts) + `loadGeoFilterComboboxOptions` (mirrors [`fetchSystemPermissionFilters`](../../frontend/lib/system-permission-api.ts)). **BFF / browser API:** [`bff-system-crud.ts`](../../frontend/lib/bff-system-crud.ts) (authed proxy CRUD handlers); [`bff-crud-client.ts`](../../frontend/lib/bff-crud-client.ts) (`authFetch` list/create/patch/delete/reorder for system modules). **Composed CRUD routes:** [`system/menu`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/menu/system-menu-list.tsx) (tree DnD + `move` API); [`system/language`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/language/system-language-list.tsx) — flat `system_language` list via [`lib/system-language-api.ts`](../../frontend/lib/system-language-api.ts) → BFF [`/api/v1/auth/proxy/system/languages`](../../frontend/app/api/v1/auth/proxy/system/languages/route.ts) → `GET /v1/system/languages`; grip reorder → `PATCH …/reorder`; create/edit/delete sheet + inline `is_active` / exclusive `is_default` switches. **Address geo:** [`system/address/*`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/country/page.tsx) — shared [`system-geo-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/_shared/system-geo-list.tsx) + [`lib/system-geo-api.ts`](../../frontend/lib/system-geo-api.ts) → BFF `/api/v1/auth/proxy/system/{countries|provinces|districts|sub-districts}`; th/en names in [`system-geo-edit-sheet.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/system/address/_shared/system-geo-edit-sheet.tsx); required parent (country/province/district) via [`RemoteComboboxField`](../../frontend/components/molecules/remote-combobox-field.tsx) + [`system-geo-combobox.ts`](../../frontend/lib/system-geo-combobox.ts) with `form.placeholder.select`; required validation on save uses `toast.error` with placeholder copy (first invalid field) + invalid field chrome, no under-field text (same as admin login); status row shows visible `col.status` label + `StatusSwitchField`; province/district/sub-district cascade **toolbar** filters use the same remote combobox with `crud.filter.select` (same pattern as system permissions); DnD on province/district/sub-district — reorder API is sibling-scoped (`createParentKey` / same country or province or district); cross-group drag shows `crud.reorder.siblingOnly` toast and does not call the API (design `crud.dragSiblingOnly` parity). Menu list: server-driven via [`lib/system-menu-api.ts`](../../frontend/lib/system-menu-api.ts); [`admin-menu-mock.ts`](../../frontend/lib/admin-menu-mock.ts) remains for seed parity and tree helpers — not runtime sidebar. **Supplier:** [`supplier`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/page.tsx) — admin routes `/admin/supplier`, `/admin/supplier/new`, `/admin/supplier/[id]`; full-page list + tabbed form (not sheet) via [`lib/supplier-user-api.ts`](../../frontend/lib/supplier-user-api.ts) → BFF `/api/v1/auth/proxy/supplier/users`; permissions `supplier.supplier_user`; Contacts tab uses sortable **item sublist** ([`supplier-contact-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/_shared/supplier-contact-list.tsx): grip + avatar initials + mail/tel meta + edit/delete; `@dnd-kit` — edit mode persists via `PATCH …/contacts/reorder`, create mode reorders local array before submit); Financial tab **bank accounts** use the same sublist pattern ([`supplier-bank-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/supplier/_shared/supplier-bank-list.tsx) — resolved setting bank label, default badge, `PATCH …/banks/reorder` on edit). create/edit use a **fixed bottom** save bar (`btn.back`/`btn.cancel` + `btn.save`), not header actions — bar uses `fixed bottom-0 right-0` with **`left`** inset (not `inset-x-0` + padding): `useSidebar()` → `left-[var(--sidebar-width)]` when desktop and sidebar open, else `left-0` (matches offcanvas gap). General-tab info cards match design field order (prefix + company → tax OTP → branch → address → geo row → tel/email); wrap `RemoteComboboxField` with visible `FieldLabel`; delivery card omits prefix/tax/branch/contact fields.

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
| `--color-status-active-*` / `--color-status-inactive-*` | `.crud-badge--*`; inactive badge — `bg-warehouse-status-inactive-bg`, `text-warehouse-status-inactive-fg`, `border-warehouse-status-inactive-border` |
| `--color-warning-*` (bg/fg/border) | Order sale **pending** pills — `bg-warehouse-warning-bg`, `text-warehouse-warning-fg`, `border-warehouse-warning-border` |
| `--color-error-*` (bg/fg/border) | Order sale **cancelled/rejected** pills — `bg-warehouse-error-bg`, `text-warehouse-error-fg`, `border-warehouse-error-border` |
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
| `page-member-setting.json` | `page.memberSettingCredit|Group|Business`, `memberSettingBusiness.*` |
| `page-member-tier.json` | `page.memberTier`, `memberTier.*` |
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

### Member settings (credit / group / business)

| Item | Detail |
|------|--------|
| Routes | `/admin/member/settings/{credit,group,business}` + co-located `loading.tsx` |
| BFF / API | [`lib/bff-member-setting-handlers.ts`](../../frontend/lib/bff-member-setting-handlers.ts) → [`app/api/v1/auth/proxy/member/settings/`](../../frontend/app/api/v1/auth/proxy/member/settings/); client [`lib/member-setting-api.ts`](../../frontend/lib/member-setting-api.ts) → Go `/api/v1/member/settings/*` |
| UI | [`member/_shared/member-setting-lang-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-setting-lang-list.tsx) (credit, group); [`member-setting-business-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-setting-business-list.tsx) (expand relations); [`member-setting-business-edit-sheet.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-setting-business-edit-sheet.tsx) — credit/group [`RemoteMultiComboboxField`](../../frontend/components/molecules/remote-multi-combobox-field.tsx) via **`GET …/businesses/filters?facet=credits|groups`** (`member.member_setting_business.view`), not `/settings/credits` or `/settings/groups` |
| i18n | [`messages/{th,en}/page-member-setting.json`](../../frontend/messages/th/page-member-setting.json); SKU conflict → `error.skuTaken` |
| Phase checklist | [`document/checklist/frontend/phase-frontend-member-setting.md`](../checklist/frontend/phase-frontend-member-setting.md) |

### Member tier settings

| Item | Detail |
|------|--------|
| Route | `/admin/member/tiers` + split [`loading.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/tiers/loading.tsx) (`MemberTierPageSkeleton`) |
| BFF / API | [`lib/bff-member-tier-handlers.ts`](../../frontend/lib/bff-member-tier-handlers.ts) → [`app/api/v1/auth/proxy/member/tiers/`](../../frontend/app/api/v1/auth/proxy/member/tiers/) (+ [`stats`](../../frontend/app/api/v1/auth/proxy/member/tiers/stats/route.ts), [`filters`](../../frontend/app/api/v1/auth/proxy/member/tiers/filters/route.ts)); client [`lib/member-tier-api.ts`](../../frontend/lib/member-tier-api.ts) → Go `/api/v1/member/tiers`, `/tiers/stats`, `/tiers/filters?facet=setting_relations` (+ nested `/:id/relations`); list rows include `member_count`, `relation_count` |
| UI | Design handoff [`design/pages/member-tier.html`](../../design/pages/member-tier.html): [`member-tier-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-tier-page.tsx) — header stats (total members + YTD sales placeholder), no list search; left tier form + card list with progress share of total members; expanded relations use design grid [`member-tier-relation-row.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-tier-relation-row.tsx); [`member-tier-relation-dialog.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-tier-relation-dialog.tsx) |
| Profile combos | [`member-tier-profile-combos.ts`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-tier-profile-combos.ts) — paginated **`GET …/tiers/filters?facet=setting_relations`** (`member.member_tier.view`); loaded when tier **create/update** opens relation dialog. View-only expand uses **`profile_business_title` / `profile_credit_name`** on tier `GET` relations ([`member-tier-relation-row.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-tier-relation-row.tsx)). |
| i18n | [`messages/{th,en}/page-member-tier.json`](../../frontend/messages/th/page-member-tier.json) |
| Phase checklist | [`document/checklist/frontend/phase-frontend-member-tier.md`](../checklist/frontend/phase-frontend-member-tier.md) |

### Member users (list + form)

| Item | Detail |
|------|--------|
| Route | `/admin/member/users`, `/new`, `/[id]` + co-located `loading.tsx` |
| BFF / API | [`lib/bff-member-user-handlers.ts`](../../frontend/lib/bff-member-user-handlers.ts) → [`app/api/v1/auth/proxy/member/users/`](../../frontend/app/api/v1/auth/proxy/member/users/) (+ `stats`, `filters`, nested files/discounts/histories); client [`lib/member-user-api.ts`](../../frontend/lib/member-user-api.ts) — list filters **`created_from` / `created_to` / `business_id`** via `client.list` **`appendQuery`** (not only extra fields on params; [`bff-crud-client`](../../frontend/lib/bff-crud-client.ts) serializes standard list keys only); filter facets [`lib/member-user-filters-combobox.ts`](../../frontend/lib/member-user-filters-combobox.ts) on **`GET …/users/filters?facet=`** (`member.member_user.view`) |
| UI | Design [`member-user.html`](../../design/pages/member-user.html): [`member-user-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-user-list.tsx), [`member-user-form.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-user-form.tsx) + tab modules (orders placeholder, [`member-user-form-discounts-tab.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/member/_shared/member-user-form-discounts-tab.tsx) — credit sub-tabs from form **`creditIds`** only (`creditTabsFromSelection`), not full business credit catalog; address geo via [`WebsiteGeoFields`](../../frontend/components/molecules/website-geo-fields.tsx); list KPI row — **Sales this month** card + `sales_this_month` from stats API only when [`useAdminBackofficeActor`](../../frontend/lib/admin-backoffice-actor-context.tsx) `type === "superadmin"`; list / bulk inline editor / expired, single-row bulk-apply bar (min qty, percent discount, dates, apply — always `discount_type: percent`), toolbar search+brand+date, pagination, multi-product picker (+ add product only); product labels via `GET …/filters?facet=product_items|product_brands|product_brand_categories`; discount tab **regular price** / derived **special price** use filter `price` (storefront display axis from active `setting_vat`, same as product browse / store sales — no frontend VAT math); discount product picker brand/category filter uses cascade dialog (`member-user-brand-category-filter-dialog.tsx`); picker confirm switches to **ราคาพิเศษ** (`bulk`) with **local pending rows** (negative temp ids) — no `POST …/discounts` until per-row Save or bulk Apply; persisted via `createMemberUserDiscount` / `patchMemberUserDiscount`, files) |
| i18n | [`messages/{th,en}/page-member-user.json`](../../frontend/messages/th/page-member-user.json), [`member-user.json`](../../frontend/messages/th/member-user.json) |
| Phase checklist | [`document/checklist/frontend/phase-frontend-member-user.md`](../checklist/frontend/phase-frontend-member-user.md) |

### Store sales (order store)

| Item | Detail |
|------|--------|
| Route | `/admin/sales/store`, `/new`, `/[id]` + `loading.tsx` |
| BFF / API | [`lib/bff-order-store-handlers.ts`](../../frontend/lib/bff-order-store-handlers.ts) → `app/api/v1/auth/proxy/order/store-sales/`; client [`lib/order-store-api.ts`](../../frontend/lib/order-store-api.ts) |
| List UI | [`sales/store/_shared/store-sales-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-list.tsx) — no row **#** column; family expand loads full `family` via [`familySlipsForExpand`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-list-rows.ts) (root + addons, split SKUs `-01`/`-02`…); expanded child rows show **ลูกค้า / วันที่สร้าง / ผู้ขาย** from each slip (`member_name`, `ordered_at`/`created_at`, `created_by_name` from detail `family`, with parent fallback for member/seller when empty); status pills via [`store-sales-status-styles.ts`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-status-styles.ts); qty/net from API; **จัดการ** = [`TableIconActions`](../../frontend/components/molecules/table-icon-actions.tsx) — **draft:** edit (blue) + cancel (red X); **pending:** view (green) + cancel; **success/cancelled/rejected:** view |
| Line discounts | [`store-sales-cart-pricing.ts`](../../frontend/lib/store-sales-cart-pricing.ts) — **`repriceStoreSalesCartLines`**: wholesale qty → unit = `price_wholesale`, **no** member/tier/catalog discount (wholesale spread still in line discount). Retail: (1) `member_user_discount` (dates, min qty, credit preference), (2) else `member_tier_relation` for **`member_setting_relation_id`** resolved from member `setting_relation_ids` + selected **`member_setting_credit_id`** ([`resolveMemberSettingRelationIdForCredit`](../../frontend/lib/member-user-relations.ts)), purchase range on cart list subtotal (Σ qty×list price), product scope (`all` / brand / category / except_*), (3) else `discount_rule` from [`exportOrderCompareRules`](../../frontend/lib/order-compare-api.ts) — category ancestors **leaf → root**, then brand-level (`category_id` null). No `member_tier` header fallback. Self-check: `STORE_SALES_PRICING_SELF_CHECK=1` when importing the module. |
| Form UI | [`store-sales-form-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-form-page.tsx) — **layout (md+):** [`ResizablePanelGroup`](../../frontend/components/ui/resizable.tsx) [`store-sales-form-desktop-split.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-form-desktop-split.tsx) via `next/dynamic` `ssr: false` (library inline styles hydrate-mismatch); agent checklist [`.cursor/rules/resizable-panels.mdc`](../../.cursor/rules/resizable-panels.mdc); 60/40 default; **v4 panel mins:** browse `minSize="35%"`, document `minSize={400}` px + `maxSize="55%"` (header single row + cart table); inner/card `min-w-[400px]`` (bare numbers = pixels); persisted layout sanitized on load/save (`onLayoutChanged`); group `style height:auto` + panel `overflow-visible! max-h-none!` + inner `overflow-x-hidden` for page scroll without column overlap; mobile stacked; browse column `md:h-full`, step-2 product card `md:flex-1` (matches document column height); product toolbar search input + submit button in one non-wrapping group (design `order-store-form__search-group`). **Document card:** [`store-sales-document-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-document-panel.tsx) — `@container/store-sales-doc`; green circular header icon; order date **`formatDate`** when cart non-empty; underline cart tabs (**จัดสินค้า** / **เทียบสินค้า**); item table (thumb, name/SKU/brand, car pill, qty input, unit/wholesale, discount, line total, delete); compare table (detail, qty, SquarePen edit + delete); blue **price summary** via [`computeStoreSalesPriceSummary`](../../frontend/lib/store-sales-cart-pricing.ts) + `fetchSettingVat` (7% fallback); footer action grid (cancel / draft / green submit → pending + `window.print()`); after pending: cart line qty + browse add/compare edits **read-only** (`readOnly` when saved `status !== draft`); hide draft + **change customer** (draft only), card footer **`showCancel`** only for draft / pending / addon compose (same as list — no red cancel on success / cancelled / rejected) + **green** `printPicking` (no gray secondary row); **addAnotherSlip** on fixed page footer (supplier pattern, `useSidebar` inset) when family root pending and no draft sibling; header **documentHeading** = SKU when assigned else create-document title; addon slip via `parent_id` + `addonCreate`; **PATCH** sends loaded `orderParentId` so addon saves do not drop the family link (design `data-start-addon`); multi-slip **family SKU combobox** on document card ([`familySlipSelectOptions`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-list-rows.ts) + shadcn `Combobox`, navigate via `router.replace`); addon compose has **no Save draft** (green submit → pending **without** `window.print()`; first slip / edit draft still prints on submit when applicable); **add another slip** snapshots the prior slip into a **collapsed** read-only document card (SKU header) above an expanded **สร้างเอกสาร** draft card (`viewSlipSnapshot`, `priorSlipCollapsed`; prior card `stickyOnSplit={false}` on desktop split); while adding a slip, **change customer** is hidden and addon card **Cancel** drops the new card via `cancelAddonSlip` + `loadDetail` (not list navigation). **Desktop split:** document panel `layout="split"` — card `sticky top-4` + `max-h-[calc(100svh-3.5rem-1rem-1.5rem)]` (not full browse column height); `CardContent` scrolls; **footer actions always visible** at bottom of card while scrolling the page. **Mobile stacked:** `layout="stacked"`; viewport cap `max-h-[calc(100svh-14rem)]` when cart non-empty. Collapsed = header only. **Document column:** not sticky; collapsible header (chevron); receive row when cart has lines; receive +30 min on first add (`scheduleShippingForCart`); shipping dialog [`store-shipping-dialog.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-shipping-dialog.tsx) — card-style type radios (Store / Truck / MapPin) + **date/time inputs for every type**; confirm persists via **`PATCH …/shipping`** → `order_list_shipping` when editing an existing order, else local state until save/create; footer actions; **Save draft** / **Create** disabled when cart empty; **Cancel** = `variant="destructive"`. step 1: member/credit (same as before); step 2 **product browse**: search + category + filter row (**car brand** + **car model** via [`loadProductCarBrandComboboxOptions`](../../frontend/lib/product-filters-api.ts) / [`loadProductCarModelComboboxOptions`](../../frontend/lib/product-filters-api.ts) — `GET /product/lists/filters?facet=cars&type_car=brand|model`, model scoped by `parent_id`; changing brand clears model; year 1990–current, OEM) → [`fetchProductItems`](../../frontend/lib/product-list-api.ts) with `car_brand_id` + model + year (backend single `product_list_car` row), not `product_brand_id`; toolbar **สินค้าทั้งหมด** (always-on browse) + **เพิ่มที่เลือก** when rows checked + **เทียบสินค้า** outline button (opens compare dialog — no product/compare tabs); extended browse fields (`available_stock`, `type_price`, wholesale hints); results table [`store-sales-product-browse-table.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-product-browse-table.tsx) (product-list-style columns, car/warehouse modals reused); [`repriceStoreSalesCartLines`](../../frontend/lib/store-sales-cart-pricing.ts) uses browse wholesale fields; print = `window.print()` only; edit load hydrates line products via `GET /product/items?ids=` ([`hydrateStoreSalesCartProducts`](../../frontend/lib/store-sales-cart-pricing.ts)) because order detail items only store `product_item_id` |
| i18n | [`messages/{th,en}/page-order-store.json`](../../frontend/messages/th/page-order-store.json) |
| RBAC | `order.order_store` |
| Phase checklist | [`document/checklist/frontend/phase-frontend-order-store.md`](../checklist/frontend/phase-frontend-order-store.md) |

### Order picking (packing desk)

| Item | Detail |
|------|--------|
| Route | `/admin/sales/order`, `/[id]`, `/[id]/payment` + `loading.tsx` |
| Form layout | [`picking-form-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-form-page.tsx) — **md+:** [`PickingFormDesktopSplit`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-form-desktop-split.tsx) via `next/dynamic` `ssr: false` (same pattern as store sales: 60/40 default, `localStorage` id `order-picking-form-split`, sidebar min 400px); mobile stacked. Skeleton: [`picking-form-desktop-split-skeleton.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-form-desktop-split-skeleton.tsx). Sticky page footer (product-list pattern: `useSidebar` inset + `pb-20`) hosts cancel / save / loan / pay. |
| Detail tabs | **ใบที่ N** only for family rows with **`doc_status === "success"`**; empty family redirects to list. Payment lines use the same filter ([`picking-payment-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-payment-page.tsx)). |
| Payment save | [`picking-payment-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-payment-page.tsx) sends `ordered_at` as RFC3339 (`YYYY-MM-DD` → local midnight ISO). Unpaid **payment** drafts omit `items` (backend rejects priced lines until settle); credit + `is_paid` settle include the line snapshot. |
| Payment member | Editable on the payment screen via [`PickingPaymentCustomerEditor`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-payment-panels.tsx) (`RemoteComboboxField` + name/tel/email, store-sales member combobox on resource **`orders`**). Billing customer is persisted on **`order_payment`** only; display falls back to **`order_list`** until the first save. Read-only document tabs show each payment’s stored member. |
| Product column | [`PickingProductCell`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/order/_shared/picking-panels.tsx) matches store browse product block ([`store-sales-product-browse-table.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/store/_shared/store-sales-product-browse-table.tsx)): badges, `SKU:` line, car chip (display-only). |
| i18n | [`messages/{th,en}/page-order-picking.json`](../../frontend/messages/th/page-order-picking.json); product badges via `productList.*` |

### Sales quotation (order quotation)

| Item | Detail |
|------|--------|
| Route | `/admin/sales/quotation`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/payment` + co-located `loading.tsx` |
| BFF / API | [`lib/bff-order-quotation-handlers.ts`](../../frontend/lib/bff-order-quotation-handlers.ts) → `app/api/v1/auth/proxy/order/quotations/`; client [`lib/order-quotation-api.ts`](../../frontend/lib/order-quotation-api.ts); seller filter [`lib/order-quotation-sellers-combobox.ts`](../../frontend/lib/order-quotation-sellers-combobox.ts) |
| List UI | [`sales/quotation/_shared/quotation-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-list.tsx) — status/overdue pills, fulfill check, receipt lock on cancel/edit |
| Form UI | [`quotation-form-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-form-page.tsx) — reuses store product browse (no compare); [`quotation-document-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-document-panel.tsx) items-only cart |
| Detail / payment | Non-draft [`quotation-detail-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-detail-page.tsx): readonly customer card, [`quotation-detail-items-panel`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-detail-items-panel.tsx) (superadmin pending inline qty/price/discount edit + PATCH save) + [`quotation-detail-meta-card`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-detail-meta-card.tsx) split; role-based pending footer + return-for-edit modal; accept / picking / duplicate; [`quotation-payment-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/quotation/_shared/quotation-payment-page.tsx) (v1 simplified methods) |
| i18n | [`messages/{th,en}/page-order-quotation.json`](../../frontend/messages/th/page-order-quotation.json) |
| RBAC | `order.order_quotation` |
| Design mockups | [`design/pages/order-quotation*.html`](../../design/pages/order-quotation.html) |
| Phase checklist | [`document/checklist/frontend/phase-frontend-order-quotation.md`](../checklist/frontend/phase-frontend-order-quotation.md) |

### Purchase orders (PO list + by-id)

| Item | Detail |
|------|--------|
| Route | `/admin/order/purchase` (list tabs); `/new` standalone create; `/[id]` status router; `/[id]/detail`; `/[id]/payment`; legacy `/[id]/approve` redirects to `/[id]` |
| Standalone create | [`purchase-create-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-create-page.tsx) — same split chrome as ticket receive; left [`purchase-create-left-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-create-left-panel.tsx) (catalog browse + custom stage → consider/compare/partner); right multi-supplier draft cards via shared [`purchase-ticket-receive-summary-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-ticket-receive-summary-panel.tsx) **without** `purchase_request_id`. VAT from `fetchSettingVat` (fallback 7% / exclude). |
| List edit | [`purchase-order-list.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-order-list.tsx) — `TableIconActions` edit when `draft` / `rejected` / `pending` (+ `order_purchase.update`). Waiting draft (`is_waiting`) opens refill tab; else → `/admin/order/purchase/[id]`. |
| `/[id]` router | [`purchase-by-id-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-by-id-page.tsx): `draft`/`rejected` → form; `pending` → approve (PO + คำร้อง tab when `purchase_request_id`); `paying` → payment; else → detail. |
| Sticky footer | Approve / detail / payment / form page actions live in [`purchase-page-footer.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-page-footer.tsx) (`fixed` bar + `useSidebar` inset + page `pb-20`); header is title/description only. |
| Ticket-created | Receive submit with `status: pending` + `purchase_request_id` → list shows edit → approve shell with request tab. |
| Phase checklist (create) | [`document/checklist/frontend/phase-frontend-order-purchase-create.md`](../checklist/frontend/phase-frontend-order-purchase-create.md) |

### Sales / purchase ticket detail

| Item | Detail |
|------|--------|
| Route | `/admin/sales/ticket/[id]/detail` and `/admin/order/purchase/ticket/[id]/detail` share [`ticket-detail-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/sales/ticket/_shared/ticket-detail-page.tsx) |
| Header | SKU + status left; **created date \| creator** muted meta on the right (`detail.created_at` / `created_by_name`) |
| Footer | Fixed bottom bar (`useSidebar` inset + `pb-20`): history left; draft edit + print request / deposit right. When `embedded` (PO approve/payment tabs), same actions as a non-fixed row — no fixed bar |
| Sidebar cards | Customer + note use `CardAction` top-right ghost **Edit** (`SquarePen`); note is read-only until dialog save via `patchTicketNote` |
| Purchase detail right rail | `showLinkedPurchases` on the purchase `/ticket/[id]/detail` route — right column is [`purchase-ticket-existing-pos-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-ticket-existing-pos-panel.tsx) (accordion PO cards: status, line items, money summary); customer / deposit / note move under the items column |
| Pending rejects | Inline on the product table row (rose/error tint + **มีปัญหา** badge): problem panel with detected date, issue text, accept-condition hint, and **ไม่ยอมรับ** / **ยอมรับ** bottom-right — not a separate top banner |
| i18n | `page.orderTicket.detail` in [`page-order-ticket.json`](../../frontend/messages/th/page-order-ticket.json) |

### Purchase ticket receive (คำร้อง → PO)

| Item | Detail |
|------|--------|
| Route | `/admin/order/purchase/ticket/[id]` = **receive** (not sales edit form). Create stays `/ticket/new`; read-only view `/ticket/[id]/detail`. |
| UI | [`purchase-ticket-receive-form.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-ticket-receive-form.tsx) — resizable split (`purchase-ticket-receive-desktop-split.tsx`, `ssr: false`); left [`purchase-ticket-receive-left-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-ticket-receive-left-panel.tsx) (header + catalog/custom tabs + พิจารณา + history); right existing POs ([`purchase-ticket-existing-pos-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/purchase/_shared/purchase-ticket-existing-pos-panel.tsx) accordion with line items + totals) + draft cards / empty state [`draftPoEmptyState`](../../frontend/messages/th/page-order-purchase.json). |
| Line types | API `catalog` / `custom` → UI tabs สินค้าที่ซื้อ / สินค้าใหม่. |
| Consider | Topics dialog → stock-history select partner, supplier pick (`GET /purchases/filters?facet=suppliers`), `createTicketItemReject` (`change`/`wait`/`stop`; `wait.date` is `YYYY-MM-DD`), `patchTicketItemStatus` rejected (cancel), `patchProductItemStopped` (stop). Ticket `product_item_name` / reject name = `product_item_language` then `product_list_language` (th) — same fallback as product browse. |
| Create PO | Draft cards → `createPurchase` with `purchase_request_id` + `items[].purchase_request_item_id`. Shared summary panel also supports standalone create (omit ticket ids). |
| Clients | [`lib/order-ticket-api.ts`](../../frontend/lib/order-ticket-api.ts), [`lib/order-purchase-api.ts`](../../frontend/lib/order-purchase-api.ts) |
| i18n | `page.orderPurchase.receive` in [`page-order-purchase.json`](../../frontend/messages/th/page-order-purchase.json) |
| Phase checklist | [`document/checklist/frontend/phase-frontend-order-purchase-ticket-receive.md`](../checklist/frontend/phase-frontend-order-purchase-ticket-receive.md) |

### Order receive (รับเข้า)

| Item | Detail |
|------|--------|
| Route | `/admin/order/receive`, `/[id]` proceed, `/[id]/detail` |
| Proceed UI | [`receive-proceed-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/receive/_shared/receive-proceed-page.tsx) — PO meta + progress cards; items with labeled **คลัง** / **พบปัญหา**; right [`receive-placement-panel.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/receive/_shared/receive-placement-panel.tsx) warehouse→bin cascade (`WarehousePlacementCascadeRow` `layout="stack"`) + qty/free + Cancel/Receive. API still posts `bin_id` only. Custom (`type=custom`) lines without `product_item_id` are allowed — backend creates catalog rows on receive (v1 parity). |
| i18n | `page.orderReceive` in [`page-order-receive.json`](../../frontend/messages/th/page-order-receive.json) |

### Order compare (catalog special price)

| Item | Detail |
|------|--------|
| Route | `/admin/order/compare` + [`loading.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/compare/loading.tsx) |
| BFF / API | [`lib/bff-order-compare-handlers.ts`](../../frontend/lib/bff-order-compare-handlers.ts) → [`app/api/v1/auth/proxy/order/compares/`](../../frontend/app/api/v1/auth/proxy/order/compares/); client [`lib/order-compare-api.ts`](../../frontend/lib/order-compare-api.ts) |
| UI | [`order/_shared/order-compare-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/order/_shared/order-compare-page.tsx) — brand/category tree, discount dialog per scope (all `member_setting_relation` rows); **`.view`** opens dialog read-only; **`.update`** enables edits, dialog Save, and fixed footer draft save; future JSON import/export → gate on `.update` / `.view` |
| i18n | [`messages/{th,en}/page-order-compare.json`](../../frontend/messages/th/page-order-compare.json) |
| RBAC | `order.order_compare` — catalog actions **view + update** only |
| Phase checklist | [`document/checklist/frontend/phase-frontend-order-compare.md`](../checklist/frontend/phase-frontend-order-compare.md) |

### Product list (item browse + aggregate form)

| Item | Detail |
|------|--------|
| Design | [`design/pages/product-list.html`](../../design/pages/product-list.html), [`product-list-form.html`](../../design/pages/product-list-form.html) |
| Routes | `/admin/product/list` (full-width table), `/admin/product/list/new`, `/admin/product/list/[id]` + `loading.tsx` |
| BFF / API | [`lib/bff-product-list-handlers.ts`](../../frontend/lib/bff-product-list-handlers.ts) → [`app/api/v1/auth/proxy/product/items/`](../../frontend/app/api/v1/auth/proxy/product/items/) (+ [`items/filters`](../../frontend/app/api/v1/auth/proxy/product/items/filters/route.ts)), [`…/lists/`](../../frontend/app/api/v1/auth/proxy/product/lists/) (+ [`lists/filters`](../../frontend/app/api/v1/auth/proxy/product/lists/filters/route.ts)); clients [`lib/product-list-api.ts`](../../frontend/lib/product-list-api.ts), [`lib/product-filters-api.ts`](../../frontend/lib/product-filters-api.ts) |
| List UI | [`product-list-page.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-page.tsx), [`product-list-table.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-table.tsx) — row **edit** deep-links to [`list/[id]`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/list/[id]/page.tsx) with `?tab=pricing&item=<product_item id>` (pricing tab + expand that variant); [`product-list-selection-bar.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-selection-bar.tsx) (sticky bulk bar when rows selected: delete, `PATCH is_stopped` open/close sales); row checkboxes when user has delete or update; product badges include red **`salesStopped`** when `is_stopped`; car/warehouse modals ([`product-list-modals.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-modals.tsx) — close via X; footer **`viewMoreDetails`** link to `/admin/product/car` when `product.product_car.view`, or `/admin/warehouse/list` when `warehouse.warehouse_list.view`); filters: search, category/brand combobox, status + `is_new` (per variant / browse row) |
| Form UI | Tabbed [`product-list-form.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form.tsx): data (info, details, codes, partners, cars), **pricing** ([`product-list-form-pricing-tab.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-pricing-tab.tsx) — collapsible variant summary row + five expanded sections per design; [`product-list-form-variant-card.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-variant-card.tsx), [`product-list-form-variant-sections.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-variant-sections.tsx), lot list modal [`product-list-form-variant-lot-modals.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-variant-lot-modals.tsx) (read-only table; pencil / footer **+** open unified add/edit [`product-list-form-variant-lot-form-modal.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-variant-lot-form-modal.tsx) — bin select from variant **`warehouse_placements`** / `GET …/warehouse-placements` only; add blocked without saved item id, without placement, or on alternate-SKU rows; partner combobox client-filtered to **`draft.supplier_ids`**, not global suppliers), history stub UI; sidebar status/note on data tab only; **footer aggregate save only** (list POST/PATCH includes all variants; no per-variant save button; variant **delete** confirms then drops row from draft — DB soft-delete on footer save, no immediate `DELETE` item API); composes list SKU prefix + variant suffix via [`product-list-form-utils.ts`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-utils.ts); **alternate SKU (รหัสแทน)** on variant section 2 adds one **draft** clone locally (`item.id` required on source; at most one pending alternate before footer save) — footer list save persists new item with `old_product_item_id` + new SKU via [`cloneListItemBody`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-utils.ts) (copies names/prices/suppliers/files/`is_new`, not `warehouse_placements`); source variant shows **`itemAlternateSkuLabel`** hint lines under product code for linked clones (`alternateSkusForSource`); browse **`is_new`** badge/filter uses `product_item.is_new`, not list-level; **variant section 2** requires composed SKU, official names (th/en), and finite weight (`validateItemSalesFields`) on footer save (design parity); variant images use [`ImageUploadField`](../../frontend/components/molecules/image-upload-field.tsx) gallery (max 5, drag reorder → `item.files` `sort_order`) in [`product-list-form-variant-sections.tsx`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-variant-sections.tsx); **section 3 storefront** follows active `setting_vat` (`exclude` → edit ex-VAT; `include` → edit `price_vat` / `price_wholesale_vat`); **`amount_price_wholesale`** (min qty for wholesale price) after wholesale incl-VAT; **section 4 channel prices** merges active **`is_default`** sale channels at price 0 via `mergeDefaultChannelPrices` / `applyDefaultChannelsToItems` on **list GET**, when **`sale_channels` filters** load, and when **adding a variant** (even if `product_item_price` is empty); inline table with channel select, ex-VAT + incl-VAT (same VAT axis as section 3), margin per channel row via `channelMarginDisplay`: \((\text{row sell on VAT axis} - \text{is\_used lot } cost\_per\_unit) / \text{row sell}\) (`—%` without saved item id or used lot; refetch after lot CRUD through `stocksRefreshKey` on variant card); add non-default channels via **+ เพิ่มช่องทางขาย**; client `_removed_channel_ids` prevents re-merging deleted defaults; `lists/filters` `sale_channels` includes `is_default`, `sort_order`, and optional `system_file_id` (logo beside channel select in section 4 via `fetchSystemFile`); **section 5 supplier tab** — inline table like section 4 (Select + cost/discount inputs, delete only; footer save persists); supplier options scoped to Data tab **`supplier_ids`**; **+ เพิ่มผู้ขาย** full-width primary like section 4; disabled + toast when no list partners or all linked; **section 5 warehouse tab** — inline table (warehouse → zone → shelf → rack → bin cascade via [`WarehousePlacementCascadeRow`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-warehouse-placement-row.tsx) `layout="table"`; existing `bin_id` hydrates full chain via [`resolveWarehouseChainFromBin`](../../frontend/lib/warehouse-api.ts) (`fetchWarehouseById` + `parent_id` walk, optional name hints from warehouse-placements meta); cascade **bin** parent = **rack** when rack selected, else **zone** only when shelf and rack are empty (zone-direct bins); if **shelf** is set without **rack**, bin combobox stays disabled; combobox remounts when parent id changes to avoid stale options; read-only **qty** from `GET …/items/{id}/warehouse-placements` `quantity` = sum of linked stock `remain_quantity` with fallback via [`remainQtyForWarehousePlacement`](../../frontend/app/[locale]/(admin)/admin/(backoffice)/product/_shared/product-list-form-lot-utils.ts) + `fetchAllProductItemStocks`; refetch on `stocksRefreshKey` after lot CRUD; draft rows `{ id?, bin_id }` saved on footer list save; qty **0** until item id + stock exist; duplicate bin on variant toast `itemWarehouseBinDuplicate` (also blocked in footer `validate()`); changing warehouse/zone/shelf/rack clears draft `bin_id` via cascade `onBinChange(0)`; `prepareItemsForSave` drops `bin_id` 0 and dedupes bins per variant; backend one-bin-one-item → list PATCH **409** `bin_in_use` → toast `itemLotBinTaken`; **+ เพิ่มตำแหน่งคลัง** full-width primary like suppliers; fixed bottom save bar matches supplier tabbed form — see **Supplier** row above |
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
