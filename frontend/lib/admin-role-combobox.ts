import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchAdminRoleById,
  fetchAdminRoles,
} from "@/lib/admin-role-api";

export async function loadAdminRoleComboboxOptions(
  locale: string,
  params: { search: string; signal?: AbortSignal; activeOnly?: boolean }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const { rows } = await fetchAdminRoles(locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
    isActive: params.activeOnly === false ? undefined : true,
  });
  if (params.signal?.aborted) return [];
  return rows.map((row) => ({
    value: String(row.id),
    label: row.name,
  }));
}

export async function resolveAdminRoleComboboxLabel(
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const detail = await fetchAdminRoleById(locale, id);
    const name =
      locale === "en"
        ? detail.names.en || detail.names.th
        : detail.names.th || detail.names.en;
    return name || null;
  } catch {
    return null;
  }
}
