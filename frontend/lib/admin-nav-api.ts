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
  isDialog?: boolean;
  dialogPath?: string;
  defaultOpen?: boolean;
  children?: AdminNavNode[];
};

export type BreadcrumbSegmentDef = {
  labels: AdminNavLabels;
  href?: string;
};

export type ApiNavNode = {
  id: number;
  icon?: string | null;
  path?: string | null;
  is_dialog?: boolean;
  labels: Record<string, string>;
  children?: ApiNavNode[];
};

export type ApiNavResponse = {
  landing_path: string;
  tree: ApiNavNode[];
};

const KNOWN_ICONS = new Set<string>([
  "shield-user",
  "user-round",
  "settings",
  "contact",
  "map-pin",
  "warehouse",
  "box",
  "package",
  "users",
  "coins",
  "shopping-bag",
  "shopping-cart",
  "clipboard-list",
]);

export function adminNavLabel(labels: AdminNavLabels, locale: string): string {
  return locale === "en" ? labels.en : labels.th;
}

function toNavIcon(raw?: string | null): AdminNavIcon | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase().replace(/_/g, "-");
  return KNOWN_ICONS.has(key) ? (key as AdminNavIcon) : undefined;
}

function toLabels(labels: Record<string, string>): AdminNavLabels {
  return { th: labels.th ?? "", en: labels.en ?? "" };
}

export function apiNavTreeToAdminNodes(tree: ApiNavNode[]): AdminNavNode[] {
  return tree.map((n) => {
    const href = n.path?.trim() || undefined;
    const children = n.children?.length
      ? apiNavTreeToAdminNodes(n.children)
      : undefined;
    return {
      id: String(n.id),
      labels: toLabels(n.labels),
      href,
      icon: toNavIcon(n.icon),
      isDialog: n.is_dialog === true,
      dialogPath: n.is_dialog && n.path ? n.path.trim() : undefined,
      children,
    };
  });
}

export function breadcrumbFromNavTree(
  pathname: string,
  tree: AdminNavNode[]
): BreadcrumbSegmentDef[] {
  const chain = findNavChain(pathname, tree);
  if (!chain) return [];
  return chain.map((n) => ({
    labels: n.labels,
    href: n.href,
  }));
}

function findNavChain(
  pathname: string,
  nodes: AdminNavNode[],
  acc: AdminNavNode[] = []
): AdminNavNode[] | null {
  for (const node of nodes) {
    const next = [...acc, node];
    if (node.href === pathname) return next;
    if (node.href && pathname.startsWith(`${node.href}/`)) {
      if (node.children?.length) {
        const deeper = findNavChain(pathname, node.children, next);
        if (deeper) return deeper;
      }
      return next;
    }
    if (node.children?.length) {
      const found = findNavChain(pathname, node.children, next);
      if (found) return found;
    }
  }
  return null;
}

export function navLabelsForPath(
  pathname: string,
  tree: AdminNavNode[],
  locale: string
): string | undefined {
  const chain = findNavChain(pathname, tree);
  if (!chain?.length) return undefined;
  return adminNavLabel(chain[chain.length - 1]!.labels, locale);
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

/** Location rows merged under map-pin menu (system_menu id 23). */
export const LOCATION_MENU_GROUP_ID = "23";

export type LocationNavMergeItem = {
  id: number;
  name: string;
  names?: { th?: string; en?: string };
};

export function mergeLocationNavNodes(
  tree: AdminNavNode[],
  items: LocationNavMergeItem[]
): AdminNavNode[] {
  if (items.length === 0) return tree;
  const extra: AdminNavNode[] = items.map((item) => {
    const th = item.names?.th?.trim() || item.name;
    const en = item.names?.en?.trim() || item.name;
    return {
      id: `loc:${item.id}`,
      labels: { th, en },
      href: `/admin/location/${item.id}`,
    };
  });
  return tree.map((node) => {
    let children = node.children;
    if (children?.length) {
      children = mergeLocationNavNodes(children, items);
    }
    if (node.icon === "map-pin" || node.id === LOCATION_MENU_GROUP_ID) {
      children = [...(children ?? []), ...extra];
    }
    if (children !== node.children) {
      return { ...node, children };
    }
    return node;
  });
}
