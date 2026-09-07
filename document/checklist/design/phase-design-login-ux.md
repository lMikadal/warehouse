# Phase: Login UX + form conventions

Redesign login page and establish standing form rules (placeholder, password eye, required asterisk, under-field errors).

## Phase checklist

- [x] Redesign `pages/login.html` — toolbar (lang/theme), brand panel, placeholders, password toggle
- [x] Add Lucide `eye` / `eye-off` icons and `js/components/password-toggle.js`
- [x] Required red `*` on labels; under-field `error.required` on empty submit
- [x] i18n keys for placeholders, show/hide password, `error.required`
- [x] Shared form CSS: `.form-field__required`, `.form-field__error`, `.form-field__error-slot`, `.password-field`
- [x] Fixed error slot — validation errors do not shift inputs
- [x] Toast redesign — card + type icon + dismiss button
- [x] Standing rules in `.cursor/rules/forms.mdc` + skill updates
- [x] Knowledge docs updated

## Required checklist

- [x] Preview via HTTP (`make design-serve`) — markup and assets verified
- [ ] Manual browser: empty submit (no layout shift), toast types via dev bar, login flow, responsive layout

## Demo accounts

| User | Password | Notes |
|------|----------|-------|
| admin | admin | superadmin — all menus and actions |
| staff | staff | limited menus; no delete/import/export |
