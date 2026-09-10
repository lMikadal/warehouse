# Phase: Member settings CRUD (design)

CRUD mockup pages for sidebar **สมาชิก → ตั้งค่า** — three leaves (`member_setting_credit`, `member_setting_group`, `member_setting_business`).

## Phase checklist

- [x] Nest under **ตั้งค่า** (`member_setting`, menu id 34); ids 52–54 are children with real page paths
- [x] Wire menu paths to `pages/member-setting-credit.html`, `member-setting-group.html`, `member-setting-business.html`
- [x] Member child sort: ตั้งค่า 100; tier 200; user 300; under ตั้งค่า: credit 100, group 200, business 300
- [x] Register three modules in `module-registry.js` via `memberSettingLangConfig` (`sortable: false`, unique optional `sku`)
- [x] Guard `settingLangConfig` save: do not write `sort_order` when `sortable === false`
- [x] Add `js/seed/member_setting_{credit,group,business}(+_language).js` + merge in `seed/index.js`
- [x] Add member setting seed scripts to all pages loading `seed/index.js`
- [x] th/en i18n for page titles and descriptions
- [x] Bump `SEED_VERSION` to `member-business-relations-1`
- [x] Business page: warehouse-style expand → relation table; credit × group combos managed in create/edit business modal (chip multi-select; optional on create; edit prefill + cartesian sync)
- [x] Each new combo creates `setting_sale_channel` (`is_default: true`) + th/en composed name
- [x] Seed 8 relations (2 businesses × 2 credits × 2 groups) and sale channels 6–13

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] All three `pages/member-setting-*.html` return HTTP 200
- [x] Sidebar **สมาชิก → ตั้งค่า** expands to Credit / Group / Business; pages open correctly
- [x] Credit / Group: search (name + sku), status filter, pagination 10/25/50/100, no drag-and-drop, status switch, create/edit dialog, delete confirm
- [x] Unique `sku` among non-deleted rows (`error.codeTaken`); empty sku allowed
- [x] th/en name switch updates the name column
- [x] `admin_menu_permission` rows exist for menus 52–54 (`member.member_setting_*.view` and sibling actions)
- [x] Business expand: chevron, relation table, delete relation + linked sale channel; add/edit combos via business modal
- [x] Sale channel list shows seeded combo channels with default on

## Out of scope

- Dedicated `member_setting_relation` menu
- Member list (`member_user`) page
- Real API / backend integration

## Related

- Member tier page — see [`phase-design-member-tier.md`](phase-design-member-tier.md)
