# Stitch admin shell reference

Visual target for the Warehouse admin sidebar + header redesign.

## Source

Generated from the Stitch modern admin shell plan. **Stitch MCP was unavailable in the implementation session** (namespace not loaded; `npx` absent), so this folder documents the applied design intent instead of raw Stitch HTML exports.

When Stitch MCP is available, regenerate with:

```
generate_screen_from_text — Warehouse admin dashboard shell (flush-left sidebar 260px, sticky glass header, breadcrumb chips, user chip, icon actions; blue-white; light/dark; shell chrome only)
```

Then compare `fetch_screen_image` output against `design/pages/admin-menu.html`.

## Applied patterns (Stitch-modern, flush-left)

| Area | Treatment |
|------|-----------|
| Sidebar surface | Elevated panel — soft right shadow, tonal bg separation from main |
| Brand | Extra padding + hairline divider under wordmark |
| Search | Inset muted field, 12px radius, strong focus ring |
| Nav rows | 2.75rem min-height, rounded-xl hover, icon well, primary-tint active |
| Sub-nav | Left accent rail; chevron 0.2s transition |
| Header | Taller glass bar, blur 12px, soft drop shadow (not border-only) |
| Breadcrumb | Chip trail (ancestor pills + primary current chip) |
| Page wash | Stronger radial blue gradient on `.admin-layout` |

Implementation: [`design/css/style.css`](../../css/style.css) (`.admin-sidebar*`, `.admin-header*`, `.sidebar-nav*`), [`design/js/components/layout.js`](../../js/components/layout.js).
