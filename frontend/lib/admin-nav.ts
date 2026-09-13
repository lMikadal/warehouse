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

export type AdminNavNode = {
  id: string;
  /** next-intl message key */
  labelKey: string;
  href?: string;
  icon?: AdminNavIcon;
  defaultOpen?: boolean;
  children?: AdminNavNode[];
};

export const ADMIN_NAV_TREE: AdminNavNode[] = [
  {
    id: "super-admin",
    labelKey: "adminNav.superAdmin",
    icon: "shield-user",
    defaultOpen: true,
    children: [
      {
        id: "admin-menu",
        labelKey: "page.adminMenu",
        href: "/admin/system/menu",
      },
      {
        id: "admin-permission",
        labelKey: "page.adminPermission",
        href: "/admin/system/permission",
      },
      { id: "admin-language", labelKey: "page.adminLanguage" },
      {
        id: "address",
        labelKey: "adminNav.address",
        children: [
          { id: "country", labelKey: "page.websiteCountry" },
          { id: "province", labelKey: "page.websiteProvince" },
          { id: "district", labelKey: "page.websiteDistrict" },
          { id: "sub-district", labelKey: "page.websiteSubDistrict" },
        ],
      },
    ],
  },
  {
    id: "admin",
    labelKey: "adminNav.admin",
    icon: "user-round",
    children: [
      { id: "admin-user", labelKey: "page.adminUser" },
      { id: "admin-role", labelKey: "page.adminRole" },
    ],
  },
];

export type BreadcrumbSegmentDef = {
  labelKey: string;
  href?: string;
};

const BREADCRUMB_BY_PATH: Record<string, BreadcrumbSegmentDef[]> = {
  "/admin/system/menu": [
    { labelKey: "adminNav.superAdmin" },
    { labelKey: "page.adminMenu" },
  ],
  "/admin/system/permission": [
    { labelKey: "adminNav.superAdmin" },
    { labelKey: "page.adminPermission" },
  ],
};

export function breadcrumbDefsForPath(pathname: string): BreadcrumbSegmentDef[] {
  return BREADCRUMB_BY_PATH[pathname] ?? [];
}

function nodeMatchesQuery(
  node: AdminNavNode,
  query: string,
  labelForKey: (key: string) => string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (labelForKey(node.labelKey).toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((child) =>
    nodeMatchesQuery(child, query, labelForKey),
  );
}

/** Returns a pruned copy of the tree for sidebar search (design #sidebar-search). */
export function filterAdminNavTree(
  nodes: AdminNavNode[],
  query: string,
  labelForKey: (key: string) => string,
): AdminNavNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (list: AdminNavNode[]): AdminNavNode[] => {
    const out: AdminNavNode[] = [];
    for (const node of list) {
      const children = node.children ? walk(node.children) : undefined;
      const selfMatch = labelForKey(node.labelKey).toLowerCase().includes(q);
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
  if (menu.length !== 2 || menu[1]?.labelKey !== "page.adminMenu") {
    throw new Error("admin-nav: menu breadcrumb drift");
  }
}
