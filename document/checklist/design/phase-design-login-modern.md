# Phase: Login visual refresh

Modernize the design login page — full-bleed split layout, atmospheric brand panel, icon toolbar, leading field icons. Auth, validation, and dev bar behavior unchanged.

## Phase checklist

- [x] Full-bleed split layout on desktop (brand ~42% + form column)
- [x] Atmospheric brand panel — gradient, grid overlay, soft glow
- [x] Icon-only lang / theme toolbar (Lucide `languages`, `sun`, `moon`)
- [x] Leading field icons (`user-round`, `lock`) via `.form-field__control`
- [x] Scoped login CSS — radial page wash, taller inputs, refined card shadow (mobile)
- [x] Add Lucide `lock.svg` to `design/assets/icons/`
- [x] Knowledge docs updated

## Required checklist

- [ ] Manual browser: empty submit (no layout shift), wrong credentials, password eye, lang + theme toggle
- [ ] Responsive: mobile card, desktop split, light + dark
