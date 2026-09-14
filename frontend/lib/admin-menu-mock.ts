import {
  defaultSortRows,
  treeDepth,
  type TreeDropZone,
} from "@/lib/crud-list-rows";

const SEED_TS = "2026-01-01T00:00:00Z";

type MenuDef = {
  id: number;
  parent_id?: number;
  module: string;
  path?: string | null;
  icon?: string | null;
  sort_order: number;
  is_superadmin_only?: boolean;
  is_dialog?: boolean;
  labels: { th: string; en: string };
};

const MENU_DEFS: MenuDef[] = [
  {
    id: 2,
    module: "admin",
    icon: "shield-user",
    sort_order: 100,
    is_superadmin_only: true,
    labels: { th: "ผู้ดูแลระบบสูงสุด", en: "Super Admin" },
  },
  {
    id: 3,
    parent_id: 2,
    module: "admin_menu",
    path: "pages/admin-menu.html",
    sort_order: 100,
    is_superadmin_only: true,
    labels: { th: "เมนู", en: "Menu" },
  },
  {
    id: 4,
    parent_id: 2,
    module: "admin_permission",
    path: "pages/admin-permission.html",
    sort_order: 200,
    is_superadmin_only: true,
    labels: { th: "สิทธิ์การใช้งาน", en: "Permission" },
  },
  {
    id: 5,
    parent_id: 2,
    module: "admin_language",
    path: "pages/admin-language.html",
    sort_order: 300,
    is_superadmin_only: true,
    labels: { th: "ภาษา", en: "Language" },
  },
  {
    id: 6,
    parent_id: 2,
    module: "admin",
    sort_order: 400,
    is_superadmin_only: true,
    labels: { th: "ที่อยู่", en: "Address" },
  },
  {
    id: 7,
    parent_id: 6,
    module: "website_country",
    path: "pages/website-country.html",
    sort_order: 100,
    is_superadmin_only: true,
    labels: { th: "ประเทศ", en: "Country" },
  },
  {
    id: 8,
    parent_id: 6,
    module: "website_province",
    path: "pages/website-province.html",
    sort_order: 200,
    is_superadmin_only: true,
    labels: { th: "จังหวัด", en: "Province" },
  },
  {
    id: 9,
    parent_id: 6,
    module: "website_district",
    path: "pages/website-district.html",
    sort_order: 300,
    is_superadmin_only: true,
    labels: { th: "เขต / อำเภอ", en: "District" },
  },
  {
    id: 10,
    parent_id: 6,
    module: "website_sub_district",
    path: "pages/website-sub-district.html",
    sort_order: 400,
    is_superadmin_only: true,
    labels: { th: "แขวง / ตำบล", en: "Sub District" },
  },
  {
    id: 11,
    module: "admin",
    icon: "user-round",
    sort_order: 200,
    labels: { th: "ผู้ดูแลระบบ", en: "Admin" },
  },
  {
    id: 12,
    parent_id: 11,
    module: "admin_user",
    path: "pages/admin-user.html",
    sort_order: 100,
    labels: { th: "รายชื่อ", en: "List" },
  },
  {
    id: 13,
    parent_id: 11,
    module: "admin_role",
    path: "pages/admin-role.html",
    sort_order: 200,
    labels: { th: "บทบาท", en: "Role" },
  },
  {
    id: 14,
    module: "setting",
    icon: "settings",
    sort_order: 300,
    labels: { th: "ตั้งค่า", en: "Setting" },
  },
  {
    id: 15,
    parent_id: 14,
    module: "setting_bank",
    path: "pages/setting-bank.html",
    sort_order: 100,
    labels: { th: "ธนาคาร", en: "Bank" },
  },
  {
    id: 16,
    parent_id: 14,
    module: "setting_vat",
    path: "pages/setting-vat.html",
    sort_order: 200,
    labels: { th: "VAT", en: "VAT" },
  },
  {
    id: 17,
    parent_id: 14,
    module: "setting_payment_method",
    path: "pages/setting-payment-method.html",
    sort_order: 300,
    labels: { th: "ช่องทางชำระ", en: "Payment" },
  },
  {
    id: 18,
    parent_id: 14,
    module: "setting_sale_channel",
    path: "pages/setting-sale-channel.html",
    sort_order: 400,
    labels: { th: "ช่องทางขาย", en: "Sale Channel" },
  },
  {
    id: 19,
    parent_id: 14,
    module: "setting_code",
    path: "pages/setting-code.html",
    sort_order: 500,
    labels: { th: "รหัส", en: "Code" },
  },
  {
    id: 20,
    parent_id: 14,
    module: "setting_claim_reason",
    path: "pages/setting-claim-reason.html",
    sort_order: 600,
    labels: { th: "เหตุผลเคลม", en: "Claim Reason" },
  },
  {
    id: 21,
    parent_id: 14,
    module: "setting_prefix",
    path: "pages/setting-prefix.html",
    sort_order: 700,
    labels: { th: "คำนำหน้า", en: "Prefix" },
  },
  {
    id: 22,
    module: "supplier",
    path: "pages/supplier-user.html",
    icon: "contact",
    sort_order: 400,
    labels: { th: "คู่ค้า", en: "Supplier" },
  },
  {
    id: 23,
    module: "location",
    icon: "map-pin",
    sort_order: 500,
    labels: { th: "สถานที่", en: "Location" },
  },
  {
    id: 24,
    parent_id: 23,
    module: "location_location",
    path: "pages/location-location.html",
    sort_order: 100,
    labels: { th: "รายการ", en: "List" },
  },
  {
    id: 25,
    module: "warehouse",
    icon: "warehouse",
    sort_order: 600,
    labels: { th: "คลังสินค้า", en: "Warehouse" },
  },
  {
    id: 26,
    parent_id: 25,
    module: "warehouse_list",
    path: "pages/warehouse-list.html",
    sort_order: 100,
    labels: { th: "รายการ", en: "List" },
  },
  {
    id: 27,
    parent_id: 25,
    module: "warehouse_list",
    path: "pages/warehouse-list-view.html",
    sort_order: 200,
    is_dialog: true,
    labels: { th: "การจัดการ", en: "Management" },
  },
  {
    id: 28,
    module: "product",
    icon: "box",
    sort_order: 700,
    labels: { th: "สินค้า", en: "Product" },
  },
  {
    id: 29,
    parent_id: 28,
    module: "product_list",
    path: "pages/product-list.html",
    sort_order: 100,
    labels: { th: "รายการ", en: "List" },
  },
  {
    id: 30,
    parent_id: 28,
    module: "product_category",
    path: "pages/product-category.html",
    sort_order: 200,
    labels: { th: "หมวดหมู่", en: "Category" },
  },
  {
    id: 31,
    parent_id: 28,
    module: "product_brand",
    path: "pages/product-brand.html",
    sort_order: 300,
    labels: { th: "แบรนด์", en: "Brand" },
  },
  {
    id: 32,
    parent_id: 28,
    module: "product_car",
    path: "pages/product-car.html",
    sort_order: 400,
    labels: { th: "หมวดหมู่รถยนต์", en: "Car Category" },
  },
  {
    id: 33,
    module: "member",
    icon: "users",
    sort_order: 750,
    labels: { th: "สมาชิก", en: "Members" },
  },
  {
    id: 34,
    parent_id: 33,
    module: "member_setting",
    sort_order: 100,
    labels: { th: "ตั้งค่า", en: "Settings" },
  },
  {
    id: 52,
    parent_id: 34,
    module: "member_setting_credit",
    path: "pages/member-setting-credit.html",
    sort_order: 100,
    labels: { th: "รูปแบบชำระ", en: "Credit" },
  },
  {
    id: 53,
    parent_id: 34,
    module: "member_setting_group",
    path: "pages/member-setting-group.html",
    sort_order: 200,
    labels: { th: "ประเภท", en: "Group" },
  },
  {
    id: 54,
    parent_id: 34,
    module: "member_setting_business",
    path: "pages/member-setting-business.html",
    sort_order: 300,
    labels: { th: "กลุ่มธุรกิจ", en: "Business" },
  },
  {
    id: 35,
    parent_id: 33,
    module: "member_tier",
    path: "pages/member-tier.html",
    sort_order: 200,
    labels: { th: "ระดับ", en: "Tier" },
  },
  {
    id: 36,
    parent_id: 33,
    module: "member_user",
    path: "pages/member-user.html",
    sort_order: 300,
    labels: { th: "รายชื่อ", en: "List" },
  },
  {
    id: 37,
    module: "order",
    icon: "coins",
    sort_order: 800,
    labels: { th: "ฝ่ายขาย", en: "Sales" },
  },
  {
    id: 38,
    parent_id: 37,
    module: "order_ticket",
    path: "#",
    sort_order: 100,
    labels: { th: "คำร้อง", en: "Ticket" },
  },
  {
    id: 39,
    parent_id: 37,
    module: "order_store",
    path: "pages/order-store.html",
    sort_order: 200,
    labels: { th: "งานขาย (หน้าร้าน)", en: "Store Sales" },
  },
  {
    id: 55,
    parent_id: 37,
    module: "order_order",
    path: "pages/order-order.html",
    sort_order: 300,
    labels: { th: "ใบจัดสินค้า", en: "Picking Slip" },
  },
  {
    id: 56,
    parent_id: 37,
    module: "order_store_claim",
    path: "pages/order-store-claim.html",
    sort_order: 400,
    labels: { th: "ทำรายการเคลม / คืน", en: "Process Claim / Return" },
  },
  {
    id: 57,
    parent_id: 37,
    module: "order_store_claim_list",
    path: "pages/order-store-claim-list.html",
    sort_order: 500,
    labels: { th: "รายการเคลม / คืน", en: "Claim / Return List" },
  },
  {
    id: 45,
    module: "order",
    icon: "shopping-bag",
    sort_order: 900,
    labels: { th: "ออเดอร์", en: "Order" },
  },
  {
    id: 46,
    parent_id: 45,
    module: "order_purchase",
    path: "#",
    sort_order: 100,
    labels: { th: "คำสั่งซื้อ", en: "Purchase" },
  },
  {
    id: 47,
    parent_id: 45,
    module: "order_compare",
    path: "#",
    sort_order: 200,
    labels: { th: "เทียบราคา", en: "Compare" },
  },
  {
    id: 48,
    parent_id: 45,
    module: "order_receive",
    path: "#",
    sort_order: 300,
    labels: { th: "รับเข้า", en: "Receive" },
  },
  {
    id: 49,
    parent_id: 45,
    module: "order_claim",
    path: "#",
    sort_order: 400,
    labels: { th: "เคลม / คืน", en: "Claim" },
  },
  {
    id: 50,
    parent_id: 45,
    module: "order_sales_claim",
    path: "#",
    sort_order: 500,
    labels: { th: "เคลม (ฝ่ายขาย)", en: "Sales Claim" },
  },
];

function buildTreePath(
  id: number,
  parentId: number | null | undefined,
  parentById: Record<number, number | null>
): string {
  const chain: number[] = [id];
  const seen: Record<number, true> = { [id]: true };
  let p = parentId ?? null;
  while (p != null) {
    if (seen[p]) {
      throw new Error(`tree_path cycle at id ${id}`);
    }
    seen[p] = true;
    chain.unshift(p);
    p = parentById[p] ?? null;
  }
  return chain.map((n) => `n${n}`).join(".");
}

function assignTreePaths(defs: MenuDef[]) {
  const parentById: Record<number, number | null> = {};
  defs.forEach((d) => {
    parentById[d.id] = d.parent_id ?? null;
  });
  return defs.map((d) => ({
    ...d,
    tree_path: buildTreePath(d.id, d.parent_id ?? null, parentById),
  }));
}

export type AdminMenuRow = {
  id: number;
  parent_id: number | null;
  module: string;
  path: string | null;
  sort_order: number;
  is_active: boolean;
  tree_path: string;
  labels: { th: string; en: string };
  created_at: string;
  updated_at: string;
};

export function adminMenuLabel(
  row: AdminMenuRow,
  locale: "th" | "en"
): string {
  return row.labels[locale] ?? row.labels.th;
}

export function createInitialAdminMenuRows(): AdminMenuRow[] {
  return assignTreePaths(MENU_DEFS).map((d) => ({
    id: d.id,
    parent_id: d.parent_id ?? null,
    module: d.module,
    path: d.path ?? null,
    sort_order: d.sort_order,
    is_active: true,
    tree_path: d.tree_path,
    labels: d.labels,
    created_at: SEED_TS,
    updated_at: SEED_TS,
  }));
}

/** Combobox value for root (no parent); not empty string — Base UI items must not be nullish. */
export const MENU_PARENT_ROOT_VALUE = "__root__";

function nextAdminMenuId(rows: AdminMenuRow[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function maxSortUnderParent(
  rows: AdminMenuRow[],
  parentId: number | null,
  excludeId?: number
): number {
  return rows
    .filter(
      (r) =>
        (r.parent_id ?? null) === parentId &&
        (excludeId == null || r.id !== excludeId)
    )
    .reduce((max, r) => Math.max(max, r.sort_order), 0);
}

function recomputeAllTreePaths(rows: AdminMenuRow[]): AdminMenuRow[] {
  const parentById: Record<number, number | null> = {};
  rows.forEach((r) => {
    parentById[r.id] = r.parent_id ?? null;
  });
  return rows.map((r) => ({
    ...r,
    tree_path: buildTreePath(r.id, r.parent_id ?? null, parentById),
  }));
}

export function menuSubtreeIds(
  rows: AdminMenuRow[],
  rootId: number
): Set<number> {
  const root = rows.find((r) => r.id === rootId);
  if (!root) return new Set();
  const prefix = `${root.tree_path}.`;
  const ids = new Set<number>([rootId]);
  rows.forEach((r) => {
    if (r.tree_path.startsWith(prefix)) ids.add(r.id);
  });
  return ids;
}

export type MenuParentOption = { value: string; label: string };

export function menuParentPickerOptions(
  rows: AdminMenuRow[],
  locale: "th" | "en",
  rootOptionLabel: string,
  excludeMenuId?: number | null
): MenuParentOption[] {
  const excluded =
    excludeMenuId != null ? menuSubtreeIds(rows, excludeMenuId) : new Set<number>();
  const sorted = defaultSortRows(rows);
  const options: MenuParentOption[] = [
    { value: MENU_PARENT_ROOT_VALUE, label: rootOptionLabel },
  ];
  for (const row of sorted) {
    if (excluded.has(row.id)) continue;
    const depth = treeDepth(row.tree_path);
    const indent = depth > 0 ? "\u00a0".repeat(depth * 2) : "";
    options.push({
      value: String(row.id),
      label: `${indent}${adminMenuLabel(row, locale)}`,
    });
  }
  return options;
}

export function isInvalidMenuParent(
  rows: AdminMenuRow[],
  menuId: number | null,
  newParentId: number | null
): boolean {
  if (newParentId == null || menuId == null) return false;
  if (newParentId === menuId) return true;
  const self = rows.find((r) => r.id === menuId);
  const candidate = rows.find((r) => r.id === newParentId);
  if (!self || !candidate) return true;
  const prefix = `${self.tree_path}.`;
  return (
    candidate.id === menuId ||
    candidate.tree_path.startsWith(prefix)
  );
}

export type AdminMenuSaveFields = {
  nameTh: string;
  nameEn: string;
  path: string;
  module: string;
  isActive: boolean;
  parentId: number | null;
};

export function appendAdminMenuRow(
  rows: AdminMenuRow[],
  payload: AdminMenuSaveFields
): AdminMenuRow[] {
  const id = nextAdminMenuId(rows);
  const now = new Date().toISOString();
  const parent_id = payload.parentId;
  const sort_order = maxSortUnderParent(rows, parent_id) + 100;
  const row: AdminMenuRow = {
    id,
    parent_id,
    module: payload.module.trim(),
    path: payload.path || null,
    sort_order,
    is_active: payload.isActive,
    tree_path: `n${id}`,
    labels: { th: payload.nameTh, en: payload.nameEn },
    created_at: now,
    updated_at: now,
  };
  return recomputeAllTreePaths([...rows, row]);
}

export function updateAdminMenuRow(
  rows: AdminMenuRow[],
  id: number,
  payload: AdminMenuSaveFields
): AdminMenuRow[] | null {
  if (isInvalidMenuParent(rows, id, payload.parentId)) return null;
  const prev = rows.find((r) => r.id === id);
  if (!prev) return null;
  const now = new Date().toISOString();
  const parentChanged =
    (prev.parent_id ?? null) !== (payload.parentId ?? null);
  const next = rows.map((r) => {
    if (r.id !== id) return r;
    return {
      ...r,
      labels: { th: payload.nameTh, en: payload.nameEn },
      path: payload.path || null,
      is_active: payload.isActive,
      parent_id: payload.parentId,
      sort_order: parentChanged
        ? maxSortUnderParent(rows, payload.parentId, id) + 100
        : r.sort_order,
      updated_at: now,
    };
  });
  return recomputeAllTreePaths(next);
}

function siblingsUnderParent(
  rows: AdminMenuRow[],
  parentId: number | null,
  excludeId?: number
): AdminMenuRow[] {
  return rows
    .filter(
      (r) =>
        (r.parent_id ?? null) === parentId &&
        (excludeId == null || r.id !== excludeId)
    )
    .sort((a, b) => {
      const so = a.sort_order - b.sort_order;
      if (so !== 0) return so;
      return a.id - b.id;
    });
}

function renormalizeSiblingSortOrders(
  rows: AdminMenuRow[],
  parentId: number | null,
  excludeId: number | undefined,
  orderById: Map<number, number>
): void {
  siblingsUnderParent(rows, parentId, excludeId).forEach((r, i) => {
    orderById.set(r.id, (i + 1) * 10);
  });
}

/** Drag-drop reparent or sibling insert (system menu tree list). */
export function moveAdminMenuRowByTreeDrop(
  rows: AdminMenuRow[],
  dragId: number,
  targetId: number,
  zone: TreeDropZone
): AdminMenuRow[] | null {
  const dragRow = rows.find((r) => r.id === dragId);
  const targetRow = rows.find((r) => r.id === targetId);
  if (!dragRow || !targetRow || dragId === targetId) return null;

  const oldParentId = dragRow.parent_id ?? null;
  let newParentId: number | null;
  let insertIndex: number;

  if (zone === "child") {
    if (isInvalidMenuParent(rows, dragId, targetId)) return null;
    newParentId = targetId;
    insertIndex = siblingsUnderParent(rows, newParentId, dragId).length;
  } else {
    newParentId = targetRow.parent_id ?? null;
    if (newParentId != null && isInvalidMenuParent(rows, dragId, newParentId)) {
      return null;
    }
    const destSiblings = siblingsUnderParent(rows, newParentId, dragId);
    const targetIdx = destSiblings.findIndex((r) => r.id === targetId);
    if (targetIdx < 0) return null;
    insertIndex = zone === "before" ? targetIdx : targetIdx + 1;
  }

  const destSiblings = siblingsUnderParent(rows, newParentId, dragId);
  const reordered = destSiblings.slice();
  reordered.splice(insertIndex, 0, dragRow);

  const now = new Date().toISOString();
  const orderById = new Map<number, number>();
  reordered.forEach((r, i) => orderById.set(r.id, (i + 1) * 10));

  if (oldParentId !== newParentId) {
    renormalizeSiblingSortOrders(rows, oldParentId, dragId, orderById);
  }

  let changed = false;
  const next = rows.map((r) => {
    if (r.id === dragId) {
      const sort_order = orderById.get(dragId) ?? r.sort_order;
      if (
        (r.parent_id ?? null) !== newParentId ||
        r.sort_order !== sort_order
      ) {
        changed = true;
        return {
          ...r,
          parent_id: newParentId,
          sort_order,
          updated_at: now,
        };
      }
      return r;
    }
    const sort_order = orderById.get(r.id);
    if (sort_order != null && r.sort_order !== sort_order) {
      changed = true;
      return { ...r, sort_order, updated_at: now };
    }
    return r;
  });

  if (!changed) return null;
  return recomputeAllTreePaths(next);
}

/** ponytail: run with `bun lib/admin-menu-mock.ts` from frontend/ */
function moveAdminMenuRowByTreeDropSelfCheck(): void {
  const rows = createInitialAdminMenuRows();
  const menu2 = rows.find((r) => r.id === 2);
  const menu12 = rows.find((r) => r.id === 12);
  if (!menu2 || !menu12) throw new Error("seed rows missing");
  const childNext = moveAdminMenuRowByTreeDrop(rows, 12, 2, "child");
  if (!childNext) throw new Error("expected child reparent");
  const moved = childNext.find((r) => r.id === 12);
  if (moved?.parent_id !== 2) {
    throw new Error("menu 12 should be child of menu 2");
  }
}

if (import.meta.main) {
  moveAdminMenuRowByTreeDropSelfCheck();
}

/** Frontend routes wired in App Router (module → path without locale prefix). */
const FRONTEND_HREF_BY_MODULE: Record<string, string> = {
  admin_menu: "/admin/system/menu",
  admin_permission: "/admin/system/permission",
};

const NAV_ICON_BY_MENU_ID = (() => {
  const map = new Map<number, AdminNavIcon>();
  MENU_DEFS.forEach((d) => {
    if (d.icon) map.set(d.id, d.icon as AdminNavIcon);
  });
  return map;
})();

const NAV_DEFAULT_OPEN_ROOT_IDS = new Set([2]);

/** Static admin sidebar tree until `admin_menu` API exists (design: admin_menu.js seed). */

export type AdminNavIcon =
  | "shield-user"
  | "user-round"
  | "settings"
  | "contact"
  | "map-pin"
  | "warehouse"
  | "box"
  | "package"
  | "users"
  | "coins"
  | "shopping-bag"
  | "shopping-cart"
  | "clipboard-list";

export type AdminNavLabels = {
  th: string;
  en: string;
};

export type AdminNavNode = {
  id: string;
  labels: AdminNavLabels;
  href?: string;
  icon?: AdminNavIcon;
  defaultOpen?: boolean;
  children?: AdminNavNode[];
};

export function adminNavLabel(labels: AdminNavLabels, locale: string): string {
  return locale === "en" ? labels.en : labels.th;
}

export function adminNavTreeFromRows(rows: AdminMenuRow[]): AdminNavNode[] {
  const active = rows.filter((r) => r.is_active);
  const byParent: Record<string, AdminMenuRow[]> = {};
  active.forEach((r) => {
    const key = r.parent_id == null ? "root" : String(r.parent_id);
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(r);
  });
  Object.values(byParent).forEach((list) => {
    list.sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.id - b.id
    );
  });

  const walk = (parentKey: string): AdminNavNode[] =>
    (byParent[parentKey] || []).map((row) => {
      const children = walk(String(row.id));
      return {
        id: String(row.id),
        labels: row.labels,
        href: FRONTEND_HREF_BY_MODULE[row.module],
        icon: NAV_ICON_BY_MENU_ID.get(row.id),
        defaultOpen: NAV_DEFAULT_OPEN_ROOT_IDS.has(row.id),
        children: children.length ? children : undefined,
      };
    });

  return walk("root");
}

export const ADMIN_NAV_TREE: AdminNavNode[] = adminNavTreeFromRows(
  createInitialAdminMenuRows()
);

export type BreadcrumbSegmentDef = {
  labels: AdminNavLabels;
  href?: string;
};

export function breadcrumbDefsForPath(
  pathname: string,
  rows: AdminMenuRow[] = createInitialAdminMenuRows()
): BreadcrumbSegmentDef[] {
  const module = Object.entries(FRONTEND_HREF_BY_MODULE).find(
    ([, path]) => path === pathname
  )?.[0];
  if (!module) return [];
  const leaf = rows.find((r) => r.module === module);
  if (!leaf) return [];
  const chain: AdminMenuRow[] = [];
  let cur: AdminMenuRow | undefined = leaf;
  while (cur) {
    chain.unshift(cur);
    cur =
      cur.parent_id != null
        ? rows.find((r) => r.id === cur!.parent_id)
        : undefined;
  }
  return chain.map((r) => ({ labels: r.labels }));
}

/** Returns a pruned copy of the tree for sidebar search (design #sidebar-search). */
export function filterAdminNavTree(
  nodes: AdminNavNode[],
  query: string,
  locale: string
): AdminNavNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (list: AdminNavNode[]): AdminNavNode[] => {
    const out: AdminNavNode[] = [];
    for (const node of list) {
      const children = node.children ? walk(node.children) : undefined;
      const selfMatch = adminNavLabel(node.labels, locale)
        .toLowerCase()
        .includes(q);
      if (selfMatch || (children && children.length > 0)) {
        out.push({
          ...node,
          children,
          defaultOpen: true,
        });
      }
    }
    return out;
  };

  return walk(nodes);
}

if (process.env.NODE_ENV !== "production") {
  const menu = breadcrumbDefsForPath("/admin/system/menu");
  if (menu.length !== 2 || menu[1]?.labels.th !== "เมนู") {
    throw new Error("admin-menu-mock: menu breadcrumb drift");
  }
}
