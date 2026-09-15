# Phase: Member tier (design)

CRUD mockup for sidebar **สมาชิก → ระดับ** (`member_tier` + profile overrides).

## Phase checklist

- [x] Wire menu id 35 to `pages/member-tier.html`
- [x] Add seeds: `member_tier`, `member_tier_language`, `member_tier_attribute`, `member_tier_relation`, `member_tier_relation_attribute`
- [x] Merge tier tables in `seed/index.js`; bump `SEED_VERSION` to `member-tier-1`
- [x] Add tier seed script tags on pages that load member setting seeds
- [x] Custom page: split form (left, tier metadata only) + tier cards (right); relation modal on green + only
- [x] Relation modal: compact scope radios; chip multi-select for profiles (add) and brand/category attributes
- [x] th/en i18n for page title, fields, scopes, errors
- [x] Lucide `medal.svg` placeholder for tier badge

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] Sidebar **สมาชิก → ระดับ** opens the page; `admin_menu_permission` links menu 35
- [x] Search + pagination 10/25/50/100 on tier list
- [x] Create / edit / soft-delete tier; th/en names; optional parent; single default tier
- [x] Tier default conditions edited only in relation modal (not on left tier form)
- [x] Expand card → profile conditions; add / edit / delete `member_tier_relation`
- [x] Unique combo per tier; validation toasts; status switch on tier
- [x] Forms: placeholders, required `*`, under-field errors; delete confirm modal

## Out of scope

- `system_file` upload for tier badge
- `member_user` list / member counts from seeded members — see [`phase-design-member-user.md`](phase-design-member-user.md)
- Drag-and-drop tier reorder UI
- Real API / backend integration
