import {
  breadcrumbLabel,
  childrenOf,
  columnCount,
  hasChildren,
  pathFromId,
  searchCategories,
} from "@/lib/product-category-cascade";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";
import { fetchProductAttributes } from "@/lib/product-attribute-api";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchMemberUserBrandCategories,
  fetchMemberUserFilters,
  type MemberUserBrandCategoryFilterItem,
} from "@/lib/member-user-filters-api";

export {
  breadcrumbLabel,
  childrenOf,
  columnCount,
  hasChildren,
  pathFromId,
  searchCategories,
};

/** ponytail: max 10 × 100 rows; upgrade to dedicated facet API if catalog grows */
const MAX_PAGES = 10;
const PAGE_LIMIT = 100;

function sortSiblings(a: ProductAttributeRow, b: ProductAttributeRow): number {
  return a.sort_order - b.sort_order || a.id - b.id;
}

export function filterBrandsBySearch(
  brands: ProductAttributeRow[],
  query: string
): ProductAttributeRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return brands;
  return brands.filter((r) => r.name.toLowerCase().includes(q));
}

export function brandCategoryRowsFromFilterItems(
  items: MemberUserBrandCategoryFilterItem[]
): ProductAttributeRow[] {
  return items
    .map((row) => ({
      id: row.id,
      parent_id: row.parent_id ?? null,
      name: row.name,
      sort_order: row.sort_order ?? 0,
      is_active: true,
      updated_at: "",
    }))
    .sort(sortSiblings);
}

export function childrenOfBrandCategory(
  rows: ProductAttributeRow[],
  parentId: number | null
): ProductAttributeRow[] {
  return childrenOf(rows, parentId);
}

export function columnCountBrandCategory(
  rows: ProductAttributeRow[],
  pickerPath: number[]
): number {
  if (!pickerPath.length) return 1;
  const last = pickerPath[pickerPath.length - 1];
  return hasChildren(rows, last) ? pickerPath.length + 1 : pickerPath.length;
}

export function selectionLabel(
  brandName: string,
  categoryRows: ProductAttributeRow[],
  categoryPath: number[]
): string {
  if (!brandName) return "";
  if (!categoryPath.length) return brandName;
  const crumb = breadcrumbLabel(categoryRows, categoryPath);
  return crumb ? `${brandName} > ${crumb}` : brandName;
}

export async function fetchAllActiveBrands(
  locale: DisplayLocale
): Promise<ProductAttributeRow[]> {
  const items: ProductAttributeRow[] = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total && page <= MAX_PAGES) {
    const res = await fetchProductAttributes("brands", locale, {
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

export async function fetchBrandCategoriesForCascade(
  locale: DisplayLocale,
  brandId: number,
  signal?: AbortSignal
): Promise<ProductAttributeRow[]> {
  const items = await fetchMemberUserBrandCategories(locale, brandId, signal);
  return brandCategoryRowsFromFilterItems(items);
}

export async function resolveMemberUserBrandLabel(
  locale: DisplayLocale,
  brandId: number
): Promise<string> {
  const { items } = await fetchMemberUserFilters(locale, "product_brands", {
    id: brandId,
    page: 1,
    limit: 1,
  });
  return items[0]?.name ?? "";
}
