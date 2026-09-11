# Phase: Member list (design)

CRUD mockup for sidebar **สมาชิก → รายชื่อ** (`member_user` + addresses, settings, owners, discounts, files, history).

## Phase checklist

- [x] Wire menu id 36 to `pages/member-user.html`
- [x] Add seeds: `member_user`, `member_address`, `member_user_setting`, `member_user_owner`, `member_file` (+ `website_file`), `member_discount`, `member_history`, `member_history_language`
- [x] Merge tables in `seed/index.js`; bump `SEED_VERSION` to `member-user-1`
- [x] Add member-user seed script tags on pages that load member tier seeds
- [x] List page: filters, stat cards, paginated table, copy SKU, status switch, delete confirm
- [x] Full-page form: create 75/25 cards; edit header + tabs (info / orders / discounts / files) + right panel
- [x] Edit tab **ประวัติการสั่งซื้อ**: KPI + charts + carousel + filters + paginated order table from `order_payment` (+ joins); seeds `order_payment`, `order_payment_item`, `order_shipping`
- [x] Persist to design schema (`member_user` identity + `member_address` tax/doc/financial + junctions)
- [x] th/en i18n for page titles, filters, form, discounts, files, history
- [x] Lucide icons: `copy`, `user-plus`, `user-check`, `phone`, `mail`, `calendar-days`, `file-text`
- [x] List UI aligned with CRUD chrome (header import/export/add, toolbar filters, stat card icons)
- [x] Form searchable selects + shared input placeholder / error-slot markup

## Required checklist

- [x] Preview via HTTP (`make design-serve`)
- [x] Sidebar **สมาชิก → รายชื่อ** opens the list; `admin_menu_permission` links menu 36 once path is real
- [x] Search, date from/to, business, status filters; pagination 10/25/50/100; no drag-and-drop
- [x] Create / edit / soft-delete member; field errors on required business, credit, group, name, tel
- [x] Tax/document same-as-general switches; geo cascade; 13-digit tax OTP
- [x] Edit discounts (sub-tabs รายการ / ราคาพิเศษ / หมดอายุ): import/export/add toolbar, filters, pagination, picker modal; **ราคาพิเศษ** = picker-session rows only; **percent (%)** only for discount unit
- [x] Edit files + history/staff/note dialogs
- [x] Order history tab: date/category filters, search, status + sort, export toast, pagination 10/25/50/100; sidebar outstanding from credit payments
- [x] Forms: placeholders, required `*`, under-field errors; delete confirm modal

## Out of scope

- Real purchase / sales on member list stat cards (placeholders `0` on list page)
- Import / export (coming-soon toast)
- Real API / backend integration

## Related

- Member settings — [`phase-design-member.md`](phase-design-member.md)
- Member tier — [`phase-design-member-tier.md`](phase-design-member-tier.md)
