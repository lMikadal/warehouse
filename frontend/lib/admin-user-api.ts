import {
  BffApiError,
  createBffCrudClient,
  type AppendListQuery,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

const BFF_USERS_BASE = "/api/v1/auth/proxy/admin/users";
const userClient = createBffCrudClient(BFF_USERS_BASE);

export const BOOTSTRAP_ADMIN_USER_ID = 1;

export type AdminUserListItem = {
  id: number;
  username: string;
  email?: string | null;
  type: string;
  status: string;
  admin_role_id?: number | null;
  role_name?: string;
  last_login_at?: string | null;
  updated_at: string;
};

export type AdminUserRow = {
  id: number;
  username: string;
  email: string | null;
  type: string;
  status: string;
  admin_role_id: number | null;
  role_name: string;
  last_login_at: string | null;
  updated_at: string;
};

export type AdminUserListParams = BffStandardListParams & {
  admin_role_id?: number;
  type?: string;
  status?: string;
};

export type AdminUserListResult = {
  rows: AdminUserRow[];
  meta: { total: number; page: number; limit: number };
};

export type AdminUserCreateBody = {
  username: string;
  email?: string;
  password: string;
  admin_role_id: number;
  type?: string;
  status?: string;
};

export type AdminUserPatchBody = {
  email?: string | null;
  password?: string;
  password_credit?: string;
  password_discount?: string;
  admin_role_id?: number;
  type?: string;
  status?: string;
};

export { BffApiError as AdminUserApiError };

function mapListItem(item: AdminUserListItem): AdminUserRow {
  return {
    id: item.id,
    username: item.username,
    email: item.email ?? null,
    type: item.type,
    status: item.status,
    admin_role_id: item.admin_role_id ?? null,
    role_name: item.role_name ?? "",
    last_login_at: item.last_login_at ?? null,
    updated_at: item.updated_at,
  };
}

function userListAppendQuery(params: AdminUserListParams): AppendListQuery {
  return (qs) => {
    if (params.admin_role_id != null && params.admin_role_id > 0) {
      qs.set("admin_role_id", String(params.admin_role_id));
    }
    if (params.type?.trim()) qs.set("type", params.type.trim());
    if (params.status?.trim()) qs.set("status", params.status.trim());
  };
}

export async function fetchAdminUsers(
  locale: string,
  params: AdminUserListParams
): Promise<AdminUserListResult> {
  const { items, meta } = await userClient.list<AdminUserListItem>(
    locale,
    params,
    userListAppendQuery(params)
  );
  return { rows: items.map(mapListItem), meta };
}

export async function fetchAdminUserById(
  locale: string,
  id: number
): Promise<AdminUserRow> {
  const item = await userClient.getById<AdminUserListItem>(locale, id);
  return mapListItem(item);
}

export async function createAdminUser(
  locale: string,
  body: AdminUserCreateBody
): Promise<{ id: number }> {
  return userClient.create(locale, body);
}

export async function patchAdminUser(
  locale: string,
  id: number,
  body: AdminUserPatchBody
): Promise<void> {
  return userClient.patchVoid(locale, id, body);
}

export async function deleteAdminUser(
  locale: string,
  id: number
): Promise<void> {
  return userClient.delete(locale, id);
}
