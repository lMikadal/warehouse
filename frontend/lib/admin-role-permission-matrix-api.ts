import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  parseBffError,
} from "@/lib/bff-crud-client";

const BFF_MATRIX = "/api/v1/auth/proxy/system/menus/permission-matrix";

export type PermissionMatrixRow = {
  menu_id: number;
  label: string;
  permissions: Record<string, number>;
};

export type PermissionMatrixGroup = {
  root_id: number;
  root_label: string;
  rows: PermissionMatrixRow[];
};

export type PermissionMatrixResponse = {
  groups: PermissionMatrixGroup[];
};

let cached: PermissionMatrixResponse | null = null;
let cachedLocale: string | null = null;

export { BffApiError as PermissionMatrixApiError };

export async function fetchAdminRolePermissionMatrix(
  locale: string
): Promise<PermissionMatrixResponse> {
  if (cached && cachedLocale === locale) {
    return cached;
  }
  const res = await authFetch(BFF_MATRIX, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) {
    throw await parseBffError(res);
  }
  const body = (await res.json()) as PermissionMatrixResponse;
  const normalized = {
    groups: body.groups ?? [],
  };
  cached = normalized;
  cachedLocale = locale;
  return normalized;
}

/** Collect all permission ids referenced in the matrix (for bootstrap role lock). */
export function allMatrixPermissionIds(
  matrix: PermissionMatrixResponse
): number[] {
  const ids = new Set<number>();
  for (const g of matrix.groups) {
    for (const row of g.rows) {
      for (const id of Object.values(row.permissions)) {
        if (Number.isFinite(id)) ids.add(id);
      }
    }
  }
  return [...ids];
}
