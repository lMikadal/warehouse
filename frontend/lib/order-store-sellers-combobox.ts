import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchStoreSalesFilters,
  type StoreSalesFilterItem,
} from "@/lib/order-store-api";

export function storeSalesSellerItemsToOptions(
  items: StoreSalesFilterItem[]
): RemoteComboboxOption[] {
  return items.map((row) => ({ value: String(row.id), label: row.name }));
}

export async function loadStoreSalesSellerComboboxOptions(
  locale: string,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchStoreSalesFilters(locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return storeSalesSellerItemsToOptions(res.items);
}

export async function resolveStoreSalesSellerLabel(
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchStoreSalesFilters(locale, { id, limit: 1 });
    return res.items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}
