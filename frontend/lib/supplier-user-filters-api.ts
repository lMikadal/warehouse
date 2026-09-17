import { authFetch } from "@/lib/auth-client";
import type { BffListMeta } from "@/lib/bff-crud-client";
import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";

const PROXY = "/api/v1/auth/proxy/supplier/users/filters";

export type SupplierUserFilterFacet = "prefixes" | "banks";

type FilterItem = { id: number; name: string };

type FiltersResponse = {
  items: FilterItem[];
  meta?: BffListMeta;
};

export type SupplierUserFiltersParams = {
  page?: number;
  limit?: number;
  search?: string;
  id?: number;
};

export async function fetchSupplierUserFilters(
  locale: string,
  facet: SupplierUserFilterFacet,
  params: SupplierUserFiltersParams & { signal?: AbortSignal } = {}
): Promise<FiltersResponse> {
  const q = new URLSearchParams();
  q.set("facet", facet);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.id != null && params.id > 0) q.set("id", String(params.id));
  const res = await authFetch(`${PROXY}?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    signal: params.signal,
  });
  if (!res.ok) {
    throw new Error(`filters ${res.status}`);
  }
  return (await res.json()) as FiltersResponse;
}

export function supplierFilterItemsToOptions(
  items: FilterItem[]
): RemoteComboboxOption[] {
  return items.map((row) => ({ value: String(row.id), label: row.name }));
}
