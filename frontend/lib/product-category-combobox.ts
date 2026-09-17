import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import { isTreePathDescendant, treeDepth } from "@/lib/crud-list-rows";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchProductAttribute,
  fetchProductAttributes,
  type ProductAttributeRow,
} from "@/lib/product-attribute-api";
import {
  fetchProductItemBrowseFilters,
  fetchProductListFilters,
  filterItemsToComboboxOptions,
} from "@/lib/product-filters-api";

function categoryOptionLabel(row: ProductAttributeRow): string {
  const depth = treeDepth(row.tree_path);
  const indent = depth > 0 ? "\u00a0".repeat(depth * 2) : "";
  return `${indent}${row.name}`;
}

function excludeCategoryParentCandidate(
  candidate: ProductAttributeRow,
  editCategoryId: number | null,
  editTreePath: string | null
): boolean {
  if (editCategoryId == null) return false;
  if (candidate.id === editCategoryId) return true;
  if (!editTreePath || !candidate.tree_path) return false;
  return isTreePathDescendant(editTreePath, candidate.tree_path);
}

export async function loadCategoryParentComboboxOptions(
  locale: DisplayLocale,
  params: {
    search: string;
    signal?: AbortSignal;
    editCategoryId?: number | null;
    editTreePath?: string | null;
  }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchProductAttributes("categories", locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
  });
  if (params.signal?.aborted) return [];
  return res.items
    .filter(
      (row) =>
        !excludeCategoryParentCandidate(
          row,
          params.editCategoryId ?? null,
          params.editTreePath ?? null
        )
    )
    .map((row) => ({
      value: String(row.id),
      label: categoryOptionLabel(row),
    }));
}

export async function resolveCategoryParentComboboxLabel(
  locale: DisplayLocale,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const row = await fetchProductAttribute("categories", locale, id);
    return categoryOptionLabel(row);
  } catch {
    return null;
  }
}

export async function loadProductItemBrowseCategoryComboboxOptions(
  locale: DisplayLocale,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchProductItemBrowseFilters(locale, "categories", {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return filterItemsToComboboxOptions(res.items);
}

export async function resolveProductItemBrowseCategoryLabel(
  locale: DisplayLocale,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchProductItemBrowseFilters(locale, "categories", {
      id,
      limit: 1,
    });
    return res.items[0]?.name ?? null;
  } catch {
    return null;
  }
}

export async function loadProductListFormCategoryComboboxOptions(
  locale: DisplayLocale,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchProductListFilters(locale, "categories", {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return filterItemsToComboboxOptions(res.items);
}

export async function resolveProductListFormCategoryLabel(
  locale: DisplayLocale,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchProductListFilters(locale, "categories", {
      id,
      limit: 1,
    });
    return res.items[0]?.name ?? null;
  } catch {
    return null;
  }
}
