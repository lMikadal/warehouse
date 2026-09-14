/** Under `/api/v1/auth/` so nginx dev gateway always hits Next BFF (see infrastructure.md). */
const BFF_PERMISSIONS_BASE = "/api/v1/auth/proxy/system/permissions";

export type SystemPermissionApiItem = {
  id: number;
  code: string;
  module: string;
  type: string;
  action: string;
  resource: string;
  method: string;
  is_active: boolean;
  updated_at: string;
};

export type SystemPermissionRow = {
  id: number;
  code: string;
  module: string;
  type: string;
  action: string;
  is_active: boolean;
};

type ListResponse = {
  items: SystemPermissionApiItem[];
  meta: { total: number; page: number; limit: number };
};

export type SystemPermissionListParams = {
  page: number;
  limit: number;
  search?: string;
  module?: string;
  type?: string;
  action?: string;
  isActive?: boolean;
  sort?: string | null;
  order?: "asc" | "desc" | null;
};

export type SystemPermissionListResult = {
  rows: SystemPermissionRow[];
  meta: { total: number; page: number; limit: number };
};

export class SystemPermissionApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<SystemPermissionApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new SystemPermissionApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new SystemPermissionApiError(res.statusText, res.status);
  }
}

function bffHeaders(locale: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": locale,
  };
}

export function mapApiPermissionToRow(
  item: SystemPermissionApiItem
): SystemPermissionRow {
  return {
    id: item.id,
    code: item.code,
    module: item.module,
    type: item.type,
    action: item.action,
    is_active: item.is_active,
  };
}

function buildListQuery(params: SystemPermissionListParams): URLSearchParams {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const search = params.search?.trim();
  if (search) qs.set("search", search);
  const mod = params.module?.trim();
  if (mod) qs.set("module", mod);
  const type = params.type?.trim();
  if (type) qs.set("type", type);
  const action = params.action?.trim();
  if (action) qs.set("action", action);
  if (params.isActive !== undefined) {
    qs.set("is_active", params.isActive ? "true" : "false");
  }
  if (params.sort && params.order) {
    qs.set("sort", params.sort);
    qs.set("order", params.order);
  }
  return qs;
}

export async function fetchSystemPermissions(
  locale: string,
  params: SystemPermissionListParams
): Promise<SystemPermissionListResult> {
  const url = `${BFF_PERMISSIONS_BASE}?${buildListQuery(params)}`;
  const res = await fetch(url, {
    headers: bffHeaders(locale),
    credentials: "same-origin",
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ListResponse;
  return {
    rows: (body.items ?? []).map(mapApiPermissionToRow),
    meta: body.meta ?? { total: 0, page: params.page, limit: params.limit },
  };
}

export async function patchSystemPermission(
  id: number,
  body: { is_active: boolean },
  locale: string
): Promise<SystemPermissionRow> {
  const res = await fetch(`${BFF_PERMISSIONS_BASE}/${id}`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  const item = (await res.json()) as SystemPermissionApiItem;
  return mapApiPermissionToRow(item);
}
