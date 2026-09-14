import type { AdminMenuRow } from "@/lib/admin-menu-mock";
import { authFetch } from "@/lib/auth-client";
import type { TreeDropZone } from "@/lib/crud-list-rows";

/** Under `/api/v1/auth/` so nginx dev gateway always hits Next BFF (see infrastructure.md). */
const BFF_MENUS_BASE = "/api/v1/auth/proxy/system/menus";

export type SystemMenuApiItem = {
  id: number;
  module: string;
  path?: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  tree_path: string;
  names: { th: string; en: string };
  updated_at: string;
};

type ListResponse = {
  items: SystemMenuApiItem[];
  meta: { total: number; page: number; limit: number };
};

export type SystemMenuListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sort?: string | null;
  order?: "asc" | "desc" | null;
};

export type SystemMenuListResult = {
  rows: AdminMenuRow[];
  meta: { total: number; page: number; limit: number };
};

export class SystemMenuApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<SystemMenuApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new SystemMenuApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new SystemMenuApiError(res.statusText, res.status);
  }
}

function bffHeaders(locale: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": locale,
  };
}

export function mapApiMenuToRow(item: SystemMenuApiItem): AdminMenuRow {
  const ts = item.updated_at;
  return {
    id: item.id,
    parent_id: item.parent_id,
    module: item.module,
    path: item.path ?? null,
    sort_order: item.sort_order,
    is_active: item.is_active,
    tree_path: item.tree_path,
    labels: { th: item.names.th, en: item.names.en },
    created_at: ts,
    updated_at: ts,
  };
}

function buildListQuery(params: SystemMenuListParams): URLSearchParams {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const search = params.search?.trim();
  if (search) qs.set("search", search);
  if (params.isActive !== undefined) {
    qs.set("is_active", params.isActive ? "true" : "false");
  }
  if (params.sort && params.order) {
    qs.set("sort", params.sort);
    qs.set("order", params.order);
  }
  return qs;
}

export async function fetchSystemMenus(
  locale: string,
  params: SystemMenuListParams
): Promise<SystemMenuListResult> {
  const url = `${BFF_MENUS_BASE}?${buildListQuery(params)}`;
  const res = await authFetch(url, {
    headers: bffHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ListResponse;
  return {
    rows: (body.items ?? []).map(mapApiMenuToRow),
    meta: body.meta ?? { total: 0, page: params.page, limit: params.limit },
  };
}

export type SystemMenuPatchBody = {
  names?: { th: string; en: string };
  is_active?: boolean;
  parent_id?: number | null;
};

export async function patchSystemMenu(
  id: number,
  body: SystemMenuPatchBody,
  locale: string
): Promise<AdminMenuRow> {
  const res = await authFetch(`${BFF_MENUS_BASE}/${id}`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  const item = (await res.json()) as SystemMenuApiItem;
  return mapApiMenuToRow(item);
}

export async function moveSystemMenu(
  dragId: number,
  targetId: number,
  zone: TreeDropZone,
  locale: string
): Promise<void> {
  const res = await authFetch(`${BFF_MENUS_BASE}/move`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify({
      drag_id: dragId,
      target_id: targetId,
      zone,
    }),
  });
  if (!res.ok) throw await parseError(res);
}
