import { authFetch } from "@/lib/auth-client";
import type { BffListMeta } from "@/lib/bff-crud-client";
import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";

const PROXY = "/api/v1/auth/proxy/product";

export type ProductFilterItem = {
  id: number;
  name: string;
  is_default?: boolean;
  sort_order?: number;
  system_file_id?: number;
};

type FiltersResponse = {
  items: ProductFilterItem[];
  meta?: BffListMeta;
};

export type ProductListFilterFacet =
  | "categories"
  | "brands"
  | "suppliers"
  | "sale_channels"
  | "warehouse_bins"
  | "cars";

export type ProductFiltersParams = {
  page?: number;
  limit?: number;
  search?: string;
  id?: number;
  typeCar?: "brand" | "model" | "engine";
  parentId?: number;
  isActive?: boolean;
};

async function fetchProductFilters(
  locale: string,
  path: string,
  facet: string,
  params: ProductFiltersParams = {},
  signal?: AbortSignal
): Promise<FiltersResponse> {
  const q = new URLSearchParams();
  q.set("facet", facet);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.id != null && params.id > 0) q.set("id", String(params.id));
  if (params.typeCar) q.set("type_car", params.typeCar);
  if (params.parentId != null && params.parentId > 0) {
    q.set("parent_id", String(params.parentId));
  }
  if (params.isActive !== undefined) {
    q.set("is_active", params.isActive ? "true" : "false");
  }
  const res = await authFetch(`${path}?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    signal,
  });
  if (!res.ok) {
    throw new Error(`filters ${res.status}`);
  }
  return (await res.json()) as FiltersResponse;
}

export async function fetchCategoryBrandFilters(
  locale: string,
  params: ProductFiltersParams & { signal?: AbortSignal } = {}
): Promise<FiltersResponse> {
  const { signal, ...rest } = params;
  return fetchProductFilters(
    locale,
    `${PROXY}/categories/filters`,
    "brands",
    rest,
    signal
  );
}

export async function fetchProductListFilters(
  locale: string,
  facet: ProductListFilterFacet,
  params: ProductFiltersParams & { signal?: AbortSignal } = {}
): Promise<FiltersResponse> {
  const { signal, ...rest } = params;
  return fetchProductFilters(
    locale,
    `${PROXY}/lists/filters`,
    facet,
    rest,
    signal
  );
}

export async function fetchProductItemBrowseFilters(
  locale: string,
  facet: "categories" | "brands",
  params: ProductFiltersParams & { signal?: AbortSignal } = {}
): Promise<FiltersResponse> {
  const { signal, ...rest } = params;
  return fetchProductFilters(
    locale,
    `${PROXY}/items/filters`,
    facet,
    rest,
    signal
  );
}

export function filterItemsToComboboxOptions(
  items: ProductFilterItem[]
): RemoteComboboxOption[] {
  return items.map((row) => ({ value: String(row.id), label: row.name }));
}
