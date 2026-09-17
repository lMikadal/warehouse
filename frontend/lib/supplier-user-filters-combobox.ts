import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchSupplierUserFilters,
  supplierFilterItemsToOptions,
  type SupplierUserFilterFacet,
} from "@/lib/supplier-user-filters-api";

async function loadFacetOptions(
  locale: string,
  facet: SupplierUserFilterFacet,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchSupplierUserFilters(locale, facet, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return supplierFilterItemsToOptions(res.items);
}

export async function loadSupplierUserPrefixComboboxOptions(
  locale: string,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  return loadFacetOptions(locale, "prefixes", params);
}

export async function resolveSupplierUserPrefixLabel(
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchSupplierUserFilters(locale, "prefixes", { id, limit: 1 });
    return res.items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}

export async function loadSupplierUserBankComboboxOptions(
  locale: string,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  return loadFacetOptions(locale, "banks", params);
}

export async function resolveSupplierUserBankLabel(
  locale: string,
  bankId: number
): Promise<string> {
  if (!Number.isFinite(bankId) || bankId <= 0) return String(bankId);
  try {
    const res = await fetchSupplierUserFilters(locale, "banks", {
      id: bankId,
      limit: 1,
    });
    return res.items[0]?.name?.trim() || String(bankId);
  } catch {
    return String(bankId);
  }
}
