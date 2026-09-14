import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  adminMenuLabel,
  type AdminMenuRow,
} from "@/lib/admin-menu-mock";
import type { DisplayLocale } from "@/lib/format-datetime";
import { treeDepth } from "@/lib/crud-list-rows";
import {
  fetchSystemMenuById,
  fetchSystemMenus,
} from "@/lib/system-menu-api";

function excludeMenuParentCandidate(
  candidate: AdminMenuRow,
  editMenuId: number | null,
  editTreePath: string | null
): boolean {
  if (editMenuId == null) return false;
  if (candidate.id === editMenuId) return true;
  if (!editTreePath) return false;
  const childPrefix = `${editTreePath}.`;
  if (candidate.tree_path.startsWith(childPrefix)) return true;
  const underPrefix = `${candidate.tree_path}.`;
  if (editTreePath.startsWith(underPrefix)) return true;
  return false;
}

export async function loadMenuParentComboboxOptions(
  locale: DisplayLocale,
  params: {
    search: string;
    signal?: AbortSignal;
    editMenuId?: number | null;
    editTreePath?: string | null;
  }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const { rows } = await fetchSystemMenus(locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
  });
  if (params.signal?.aborted) return [];
  return rows
    .filter(
      (row) =>
        !excludeMenuParentCandidate(
          row,
          params.editMenuId ?? null,
          params.editTreePath ?? null
        )
    )
    .map((row) => {
      const depth = treeDepth(row.tree_path);
      const indent = depth > 0 ? "\u00a0".repeat(depth * 2) : "";
      return {
        value: String(row.id),
        label: `${indent}${adminMenuLabel(row, locale)}`,
      };
    });
}

export async function resolveMenuParentComboboxLabel(
  locale: DisplayLocale,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const row = await fetchSystemMenuById(id, locale);
    const depth = treeDepth(row.tree_path);
    const indent = depth > 0 ? "\u00a0".repeat(depth * 2) : "";
    return `${indent}${adminMenuLabel(row, locale)}`;
  } catch {
    return null;
  }
}
