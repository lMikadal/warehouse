import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchQuotationFilters,
  type QuotationFilterItem,
} from "@/lib/order-quotation-api";

function itemsToOptions(items: QuotationFilterItem[]): RemoteComboboxOption[] {
  return items.map((row) => ({ value: String(row.id), label: row.name }));
}

export async function loadQuotationSellerComboboxOptions(
  locale: string,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchQuotationFilters(locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return itemsToOptions(res.items);
}

export async function resolveQuotationSellerLabel(
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchQuotationFilters(locale, { id, limit: 1 });
    return res.items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}
