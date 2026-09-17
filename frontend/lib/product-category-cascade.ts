import {
  fetchProductAttribute,
  fetchProductAttributes,
  type ProductAttributeRow,
} from "@/lib/product-attribute-api";
import type { DisplayLocale } from "@/lib/format-datetime";

/** ponytail: max 10 × 100 rows; upgrade to parent_id facet API if catalog grows */
const MAX_PAGES = 10;
const PAGE_LIMIT = 100;

function sortSiblings(a: ProductAttributeRow, b: ProductAttributeRow): number {
  return a.sort_order - b.sort_order || a.id - b.id;
}

export function childrenOf(
  rows: ProductAttributeRow[],
  parentId: number | null
): ProductAttributeRow[] {
  return rows
    .filter((r) =>
      parentId == null ? r.parent_id == null : r.parent_id === parentId
    )
    .sort(sortSiblings);
}

export function hasChildren(
  rows: ProductAttributeRow[],
  id: number
): boolean {
  return childrenOf(rows, id).length > 0;
}

export function pathFromId(
  rows: ProductAttributeRow[],
  id: number | null | undefined
): number[] {
  if (id == null || id <= 0) return [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const chain: number[] = [];
  let node = byId.get(id);
  const guard = new Set<number>();
  while (node && !guard.has(node.id)) {
    guard.add(node.id);
    chain.unshift(node.id);
    node =
      node.parent_id != null ? byId.get(node.parent_id) ?? undefined : undefined;
  }
  return chain;
}

export function breadcrumbLabel(
  rows: ProductAttributeRow[],
  pathOrId: number[] | number | null | undefined
): string {
  const path = Array.isArray(pathOrId)
    ? pathOrId
    : pathFromId(rows, pathOrId ?? null);
  if (!path.length) return "";
  const byId = new Map(rows.map((r) => [r.id, r]));
  return path
    .map((id) => byId.get(id)?.name)
    .filter(Boolean)
    .join(" > ");
}

export function searchCategories(
  rows: ProductAttributeRow[],
  query: string
): ProductAttributeRow[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  return rows.filter((r) => r.name.toLowerCase().includes(q));
}

export function columnCount(
  rows: ProductAttributeRow[],
  pickerPath: number[]
): number {
  if (!pickerPath.length) return 1;
  const last = pickerPath[pickerPath.length - 1];
  return hasChildren(rows, last) ? pickerPath.length + 1 : pickerPath.length;
}

export async function fetchAllActiveCategories(
  locale: DisplayLocale
): Promise<ProductAttributeRow[]> {
  const items: ProductAttributeRow[] = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total && page <= MAX_PAGES) {
    const res = await fetchProductAttributes("categories", locale, {
      page,
      limit: PAGE_LIMIT,
      isActive: true,
    });
    items.push(...res.items);
    total = res.meta.total;
    if (res.items.length === 0) break;
    page += 1;
  }
  return items;
}

export async function resolveCategoryBreadcrumb(
  locale: DisplayLocale,
  id: number | null | undefined,
  cachedRows?: ProductAttributeRow[]
): Promise<string> {
  if (id == null || id <= 0) return "";
  if (cachedRows?.length) {
    return breadcrumbLabel(cachedRows, id);
  }
  const rows = await fetchAllActiveCategories(locale);
  const fromCache = breadcrumbLabel(rows, id);
  if (fromCache) return fromCache;
  const chain: ProductAttributeRow[] = [];
  let currentId: number | null = id;
  const seen = new Set<number>();
  for (let depth = 0; depth < 20 && currentId != null && !seen.has(currentId); depth++) {
    seen.add(currentId);
    const row = await fetchProductAttribute("categories", locale, currentId);
    chain.unshift(row);
    currentId = row.parent_id;
  }
  return chain.map((r) => r.name).join(" > ");
}
