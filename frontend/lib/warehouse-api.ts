import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  createBffCrudClient,
  parseBffError,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";
import type { TreeDropZone } from "@/lib/crud-list-rows";

export type WarehouseStats = {
  sku_count: number;
  remain_qty: number;
  zone_count: number;
};

export type WarehouseListItem = {
  id: number;
  type: string;
  sku: string;
  name: string;
  sort_order: number;
  capacity: number;
  is_active: boolean;
  updated_at: string;
  stats?: WarehouseStats;
  names?: { th?: string; en?: string };
};

export type WarehouseCondition = {
  type: string;
  amount: number;
  amount_active: number;
};

export type WarehouseTreeNode = {
  id: number;
  type: string;
  sku: string;
  parent_id: number | null;
  sort_order: number;
  capacity: number;
  is_active: boolean;
  name: string;
  used: number;
  capacity_pct: number;
  child_counts?: Record<string, number>;
  conditions?: WarehouseCondition[];
};

export { BffApiError as WarehouseApiError };

const PROXY = "/api/v1/auth/proxy/warehouse/lists";
const client = createBffCrudClient(PROXY);

export async function fetchWarehouseList(
  locale: string,
  params: BffStandardListParams & {
    type?: string;
    parentId?: number;
    includeStats?: boolean;
  }
) {
  return client.list<WarehouseListItem>(locale, params, (qs) => {
    if (params.type) qs.set("type", params.type);
    if (params.parentId != null) qs.set("parent_id", String(params.parentId));
    if (params.includeStats) qs.set("include", "stats");
  });
}

export async function fetchWarehouseById(locale: string, id: number) {
  return client.getById<Record<string, unknown>>(locale, id);
}

export type WarehouseCascadeLevel =
  | "warehouse"
  | "zone"
  | "shelf"
  | "rack"
  | "bin";

export type WarehouseChainResolved = {
  ids: Record<WarehouseCascadeLevel, string>;
  labels: Partial<Record<WarehouseCascadeLevel, string>>;
};

const emptyWarehouseChain = (): WarehouseChainResolved => ({
  ids: { warehouse: "", zone: "", shelf: "", rack: "", bin: "" },
  labels: {},
});

const warehouseChainCache = new Map<string, WarehouseChainResolved>();

function warehouseNodeLabel(row: Record<string, unknown>): string {
  const name = row.name;
  if (typeof name === "string" && name.trim()) return name;
  const sku = row.sku;
  if (typeof sku === "string" && sku.trim()) return sku;
  const id = row.id;
  return id != null ? String(id) : "—";
}

const CASCADE_LEVELS: WarehouseCascadeLevel[] = [
  "warehouse",
  "zone",
  "shelf",
  "rack",
  "bin",
];

function isCascadeLevel(type: string): type is WarehouseCascadeLevel {
  return (CASCADE_LEVELS as string[]).includes(type);
}

/** Walk parent_id from bin to root; map nodes by type (zone→rack shortcuts omit shelf). */
export async function resolveWarehouseChainFromBin(
  locale: string,
  binId: number
): Promise<WarehouseChainResolved> {
  if (binId <= 0) return emptyWarehouseChain();

  const cacheKey = `${locale}:${binId}`;
  const cached = warehouseChainCache.get(cacheKey);
  if (cached) return cached;

  const ids = { ...emptyWarehouseChain().ids };
  const labels: Partial<Record<WarehouseCascadeLevel, string>> = {};

  let curId: number | null = binId;
  for (let hop = 0; hop < 8 && curId != null && curId > 0; hop++) {
    const row = await fetchWarehouseById(locale, curId);
    const type = String(row.type ?? "");
    const id = Number(row.id);
    if (!id) break;
    if (isCascadeLevel(type)) {
      ids[type] = String(id);
      labels[type] = warehouseNodeLabel(row);
    }
    const parent = row.parent_id;
    curId =
      parent == null || parent === ""
        ? null
        : Number(parent);
  }

  const result: WarehouseChainResolved = { ids, labels };
  warehouseChainCache.set(cacheKey, result);
  return result;
}

export async function createWarehouseNode(
  locale: string,
  body: Record<string, unknown>
) {
  return client.create(locale, body);
}

export async function patchWarehouseNode(
  locale: string,
  id: number,
  body: Record<string, unknown>
) {
  return client.patchVoid(locale, id, body);
}

export async function deleteWarehouseNode(locale: string, id: number) {
  return client.delete(locale, id);
}

export async function reorderWarehouseNodes(
  locale: string,
  dragId: number,
  targetId: number
) {
  return client.reorder(locale, dragId, targetId);
}

export async function moveWarehouseNode(
  locale: string,
  body: { drag_id: number; target_id: number; zone: TreeDropZone }
) {
  const res = await authFetch(`${PROXY}/move`, {
    method: "PATCH",
    headers: { ...bffJsonHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseBffError(res);
}

export async function fetchWarehouseTree(locale: string, warehouseId: number) {
  const res = await authFetch(`${PROXY}/${warehouseId}/tree`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  const data = (await res.json()) as { items: WarehouseTreeNode[] };
  return data.items;
}

export async function fetchWarehouseStats(locale: string, warehouseId: number) {
  const res = await authFetch(`${PROXY}/${warehouseId}/stats`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as WarehouseStats;
}

export async function patchWarehouseConditions(
  locale: string,
  zoneId: number,
  body: Record<string, unknown>
) {
  const res = await authFetch(`${PROXY}/${zoneId}/conditions`, {
    method: "PATCH",
    headers: { ...bffJsonHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseBffError(res);
}
