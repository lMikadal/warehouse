import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchProductAttribute,
  fetchProductAttributes,
} from "@/lib/product-attribute-api";

export async function loadProductBrandComboboxOptions(
  locale: DisplayLocale,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchProductAttributes("brands", locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    isActive: true,
  });
  if (params.signal?.aborted) return [];
  return res.items.map((row) => ({
    value: String(row.id),
    label: row.name,
  }));
}

export async function resolveProductBrandLabels(
  locale: DisplayLocale,
  ids: string[]
): Promise<RemoteComboboxOption[]> {
  const out: RemoteComboboxOption[] = [];
  for (const id of ids) {
    const num = Number(id);
    if (!Number.isFinite(num) || num <= 0) continue;
    try {
      const row = await fetchProductAttribute("brands", locale, num);
      out.push({ value: id, label: row.name });
    } catch {
      /* skip missing */
    }
  }
  return out;
}
