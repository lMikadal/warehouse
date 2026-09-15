import {
  BffApiError,
  createBffCrudClient,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

const BFF_ROLES_BASE = "/api/v1/auth/proxy/admin/roles";
const roleClient = createBffCrudClient(BFF_ROLES_BASE);

export const BOOTSTRAP_ADMIN_ROLE_ID = 1;

export type AdminRoleListItem = {
  id: number;
  name: string;
  is_active: boolean;
  updated_at: string;
};

export type AdminRoleRow = {
  id: number;
  name: string;
  is_active: boolean;
  updated_at: string;
};

export type AdminRoleDetail = {
  id: number;
  is_active: boolean;
  names: { th: string; en: string };
  permission_ids: number[];
};

export type AdminRoleListParams = BffStandardListParams;

export type AdminRoleListResult = {
  rows: AdminRoleRow[];
  meta: { total: number; page: number; limit: number };
};

export type AdminRoleWriteBody = {
  is_active?: boolean;
  names?: { th: string; en: string };
  permission_ids?: number[];
};

export { BffApiError as AdminRoleApiError };

function mapListItem(item: AdminRoleListItem): AdminRoleRow {
  return {
    id: item.id,
    name: item.name,
    is_active: item.is_active,
    updated_at: item.updated_at,
  };
}

export async function fetchAdminRoles(
  locale: string,
  params: AdminRoleListParams
): Promise<AdminRoleListResult> {
  const { items, meta } = await roleClient.list<AdminRoleListItem>(
    locale,
    params
  );
  return { rows: items.map(mapListItem), meta };
}

export async function fetchAdminRoleById(
  locale: string,
  id: number
): Promise<AdminRoleDetail> {
  return roleClient.getById<AdminRoleDetail>(locale, id);
}

export async function createAdminRole(
  locale: string,
  body: AdminRoleWriteBody
): Promise<{ id: number }> {
  return roleClient.create(locale, body);
}

export async function patchAdminRole(
  locale: string,
  id: number,
  body: AdminRoleWriteBody
): Promise<void> {
  return roleClient.patchVoid(locale, id, body);
}

export async function deleteAdminRole(
  locale: string,
  id: number
): Promise<void> {
  return roleClient.delete(locale, id);
}
