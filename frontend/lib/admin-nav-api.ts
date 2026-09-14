import {
  type AdminNavIcon,
  type AdminNavLabels,
  type AdminNavNode,
  type BreadcrumbSegmentDef,
  adminNavLabel,
} from "@/lib/admin-menu-mock";

export type ApiNavNode = {
  id: number;
  icon?: string | null;
  path?: string | null;
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
