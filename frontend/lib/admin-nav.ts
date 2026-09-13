/** Static admin sidebar tree until `admin_menu` API exists (design: admin_menu.js seed). */

export type AdminNavIcon =
  | "shield-user"
  | "user-round"
  | "settings"
  | "contact"
  | "map-pin"
  | "warehouse"
  | "package"
  | "users"
  | "shopping-cart"
  | "clipboard-list";

/** ponytail: mock labels in-repo until API returns display names per locale */
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

export const ADMIN_NAV_TREE: AdminNavNode[] = [
  {
    id: "super-admin",
    labels: { th: "ผู้ดูแลระบบสูงสุด", en: "Super Admin" },
    icon: "shield-user",
    defaultOpen: true,
    children: [
      {
        id: "admin-menu",
        labels: { th: "เมนู", en: "Menu" },
        href: "/admin/system/menu",
      },
      {
        id: "admin-permission",
        labels: { th: "สิทธิ์การใช้งาน", en: "Permissions" },
        href: "/admin/system/permission",
      },
      {
        id: "admin-language",
        labels: { th: "ภาษา", en: "Language" },
      },
      {
        id: "address",
        labels: { th: "ที่อยู่", en: "Address" },
        children: [
          {
            id: "country",
            labels: { th: "ประเทศ", en: "Country" },
          },
          {
            id: "province",
            labels: { th: "จังหวัด", en: "Province" },
          },
          {
            id: "district",
            labels: { th: "เขต / อำเภอ", en: "District" },
          },
          {
            id: "sub-district",
            labels: { th: "แขวง / ตำบล", en: "Sub District" },
          },
        ],
      },
    ],
  },
  {
    id: "admin",
    labels: { th: "ผู้ดูแลระบบ", en: "Admin" },
    icon: "user-round",
    children: [
      {
        id: "admin-user",
        labels: { th: "รายชื่อ", en: "List" },
      },
      {
        id: "admin-role",
        labels: { th: "บทบาท", en: "Role" },
      },
    ],
  },
];

export type BreadcrumbSegmentDef = {
  labels: AdminNavLabels;
  href?: string;
};

const BREADCRUMB_BY_PATH: Record<string, BreadcrumbSegmentDef[]> = {
  "/admin/system/menu": [
    { labels: { th: "ผู้ดูแลระบบสูงสุด", en: "Super Admin" } },
    { labels: { th: "เมนู", en: "Menu" } },
  ],
  "/admin/system/permission": [
    { labels: { th: "ผู้ดูแลระบบสูงสุด", en: "Super Admin" } },
    { labels: { th: "สิทธิ์การใช้งาน", en: "Permissions" } },
  ],
};

export function breadcrumbDefsForPath(pathname: string): BreadcrumbSegmentDef[] {
  return BREADCRUMB_BY_PATH[pathname] ?? [];
}

function nodeMatchesQuery(
  node: AdminNavNode,
  query: string,
  locale: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (adminNavLabel(node.labels, locale).toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((child) =>
    nodeMatchesQuery(child, query, locale),
  );
}

/** Returns a pruned copy of the tree for sidebar search (design #sidebar-search). */
export function filterAdminNavTree(
  nodes: AdminNavNode[],
  query: string,
  locale: string,
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

// ponytail: self-check — breadcrumb map must stay aligned with wired routes
if (process.env.NODE_ENV !== "production") {
  const menu = breadcrumbDefsForPath("/admin/system/menu");
  if (menu.length !== 2 || menu[1]?.labels.th !== "เมนู") {
    throw new Error("admin-nav: menu breadcrumb drift");
  }
}
