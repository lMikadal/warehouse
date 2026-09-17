import {
  childrenOf,
  hasChildren,
  pathFromId,
} from "@/lib/product-category-cascade";
import {
  fetchProductAttributes,
  type ProductAttributeRow,
} from "@/lib/product-attribute-api";
import type { DisplayLocale } from "@/lib/format-datetime";

export { childrenOf, hasChildren, pathFromId };

/** ponytail: max 10 × 100 rows; upgrade to parent_id facet API if catalog grows */
const MAX_PAGES = 10;
const PAGE_LIMIT = 100;

function sortSiblings(a: ProductAttributeRow, b: ProductAttributeRow): number {
  return a.sort_order - b.sort_order || a.id - b.id;
}

export function carBrands(rows: ProductAttributeRow[]): ProductAttributeRow[] {
  return rows
    .filter((r) => r.type_car === "brand" && r.parent_id == null)
    .sort(sortSiblings);
}

export function filterBrandsBySearch(
  brands: ProductAttributeRow[],
  query: string
): ProductAttributeRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return brands;
  return brands.filter((r) => r.name.toLowerCase().includes(q));
}

export function nameById(
  rows: ProductAttributeRow[],
  id: number | null | undefined
): string {
  if (id == null || id <= 0) return "";
  return rows.find((r) => r.id === id)?.name ?? "";
}

export async function fetchAllActiveCars(
  locale: DisplayLocale
): Promise<ProductAttributeRow[]> {
  const items: ProductAttributeRow[] = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total && page <= MAX_PAGES) {
    const res = await fetchProductAttributes("cars", locale, {
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

/** Path [brandId, modelId, engineId] from a saved fitment row */
export function carPathFromRow(
  rows: ProductAttributeRow[],
  brandId: number | null | undefined,
  modelId: number | null | undefined,
  engineId: number | null | undefined
): number[] {
  if (engineId != null && engineId > 0) {
    const fromEngine = pathFromId(rows, engineId);
    if (fromEngine.length >= 3) return fromEngine.slice(0, 3);
  }
  const path: number[] = [];
  if (brandId != null && brandId > 0) path.push(brandId);
  if (modelId != null && modelId > 0) path.push(modelId);
  if (engineId != null && engineId > 0) path.push(engineId);
  return path;
}
