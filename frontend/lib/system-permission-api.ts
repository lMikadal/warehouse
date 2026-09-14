import {
  BffApiError,
  createBffCrudClient,
  type AppendListQuery,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

/** Under `/api/v1/auth/` so nginx dev gateway always hits Next BFF (see infrastructure.md). */
const BFF_PERMISSIONS_BASE = "/api/v1/auth/proxy/system/permissions";
const permissionClient = createBffCrudClient(BFF_PERMISSIONS_BASE);

const PERMISSION_ACTION_KEYS = [
  "view",
  "create",
  "update",
  "delete",
  "import",
  "export",
] as const;

export type PermissionActionKey = (typeof PERMISSION_ACTION_KEYS)[number];

export type SystemPermissionFilterFacets = {
  modules: string[];
  types: string[];
  actions: string[];
};

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

export type SystemPermissionListParams = BffStandardListParams & {
  module?: string;
  type?: string;
  action?: string;
};

export type SystemPermissionListResult = {
  rows: SystemPermissionRow[];
  meta: { total: number; page: number; limit: number };
};

export { BffApiError as SystemPermissionApiError };

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

function permissionListAppendQuery(
  params: SystemPermissionListParams
): AppendListQuery {
  return (qs) => {
    const mod = params.module?.trim();
    if (mod) qs.set("module", mod);
    const type = params.type?.trim();
    if (type) qs.set("type", type);
    const action = params.action?.trim();
    if (action) qs.set("action", action);
  };
}

function isPermissionActionKey(action: string): action is PermissionActionKey {
  return (PERMISSION_ACTION_KEYS as readonly string[]).includes(action);
}

/** i18n label for permission action enum values from API (no perm-catalog). */
export function permissionActionLabel(
  action: string,
  tAction: (key: PermissionActionKey) => string
): string {
  return isPermissionActionKey(action) ? tAction(action) : action;
}

export async function fetchSystemPermissionFilters(
  locale: string,
  module?: string
): Promise<SystemPermissionFilterFacets> {
  const qs = new URLSearchParams();
  const mod = module?.trim();
  if (mod) qs.set("module", mod);
  const suffix = qs.toString() ? `?${qs}` : "";
  const body = await permissionClient.getJson<SystemPermissionFilterFacets>(
    locale,
    `/filters${suffix}`
  );
  return {
    modules: body.modules ?? [],
    types: body.types ?? [],
    actions: body.actions ?? [],
  };
}

export async function fetchSystemPermissions(
  locale: string,
  params: SystemPermissionListParams
): Promise<SystemPermissionListResult> {
  const { items, meta } = await permissionClient.list<SystemPermissionApiItem>(
    locale,
    params,
    permissionListAppendQuery(params)
  );
  return {
    rows: items.map(mapApiPermissionToRow),
    meta,
  };
}

export async function patchSystemPermission(
  id: number,
  body: { is_active: boolean },
  locale: string
): Promise<SystemPermissionRow> {
  const item = await permissionClient.patchJson<SystemPermissionApiItem>(
    locale,
    id,
    body
  );
  return mapApiPermissionToRow(item);
}
