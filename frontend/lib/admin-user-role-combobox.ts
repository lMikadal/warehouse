import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import { fetchAdminUserRoleFilters } from "@/lib/admin-user-api";

export async function loadAdminUserRoleComboboxOptions(
  locale: string,
  params: {
    search: string;
    signal?: AbortSignal;
    activeOnly?: boolean;
  }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const { roles } = await fetchAdminUserRoleFilters(locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search,
    isActive: params.activeOnly === false ? undefined : true,
  });
  if (params.signal?.aborted) return [];
  return roles.map((row) => ({
    value: String(row.id),
    label: row.name,
  }));
}

export async function resolveAdminUserRoleComboboxLabel(
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const { roles } = await fetchAdminUserRoleFilters(locale, {
      adminRoleId: id,
    });
    return roles[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}
