import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchCategoryBrandFilters,
  fetchProductItemBrowseFilters,
  fetchProductListFilters,
  filterItemsToComboboxOptions,
} from "@/lib/product-filters-api";

export type ProductBrandComboboxSource = "categoryForm" | "itemBrowse" | "listForm";

async function fetchBrandFilterItems(
  locale: DisplayLocale,
  source: ProductBrandComboboxSource,
  params: {
    search?: string;
    id?: number;
    signal?: AbortSignal;
  }
) {
  const { signal, search, id } = params;
  const base = {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: search?.trim() || undefined,
    id,
    isActive: true,
    signal,
  };
  if (source === "categoryForm") {
    return fetchCategoryBrandFilters(locale, base);
  }
  if (source === "itemBrowse") {
    return fetchProductItemBrowseFilters(locale, "brands", base);
  }
  return fetchProductListFilters(locale, "brands", base);
}

export async function loadProductBrandComboboxOptions(
  locale: DisplayLocale,
  params: {
    search: string;
    signal?: AbortSignal;
    source?: ProductBrandComboboxSource;
  }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchBrandFilterItems(locale, params.source ?? "listForm", {
    search: params.search,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return filterItemsToComboboxOptions(res.items);
}

export async function resolveProductBrandLabels(
  locale: DisplayLocale,
  ids: string[],
  source: ProductBrandComboboxSource = "listForm"
): Promise<RemoteComboboxOption[]> {
  const out: RemoteComboboxOption[] = [];
  for (const id of ids) {
    const num = Number(id);
    if (!Number.isFinite(num) || num <= 0) continue;
    try {
      const res = await fetchBrandFilterItems(locale, source, { id: num });
      const name = res.items[0]?.name;
      if (name) out.push({ value: id, label: name });
    } catch {
      /* skip missing */
    }
  }
  return out;
}
