/**
 * Client for /api/v1/order/receives — the goods-in side of a purchase order. List, count, detail and
 * history mirror the purchase shapes on purpose: the receive desk works on the same orders, narrowed
 * to the ones that have been paid for, so the row and detail types are reused rather than copied.
 */

import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";
import type {
  PurchaseCountResponse,
  PurchaseDetail,
  PurchaseFilterItem,
  PurchaseItemFile,
  PurchaseListResponse,
  PurchaseUnit,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

const PROXY_BASE = "/api/v1/auth/proxy/order/receives";

export class OrderReceiveApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderReceiveApiError> {
  const e = await parseBffError(res);
  return new OrderReceiveApiError(e.message, e.status, e.code);
}

/** The order statuses the receive desk works on; anything earlier has not been paid for. */
export const RECEIVE_STATUSES = [
  "completed",
  "receive_partial",
  "receive_completed",
] as const;

export type ReceiveStatus = (typeof RECEIVE_STATUSES)[number];

/** "" is the all-chip; `reject` folds in the orders that came in with something wrong. */
export type ReceiveStatusFilter = ReceiveStatus | "reject" | "";

export type ReceivePlacementInput = {
  bin_id: number;
  stock_qty: number;
};

export type ReceiveItemBody = {
  sell_price: number;
  sell_price_vat: number;
  bonus_qty?: number;
  note?: string;
  placements: ReceivePlacementInput[];
};

export type ReceiveItemResult = {
  product_item_id: number;
  product_list_id: number;
  order_status: string;
};

export type ReceiveBinOption = {
  id: number;
  sku: string;
  name: string;
  /** warehouse / zone / shelf / rack, derived from the tree — never stored on the placement. */
  path: string;
  capacity: number;
  used: number;
  free: number;
  product_item_id?: number | null;
  barcode?: string;
  qrcode?: string;
};

export type ReceiveRejectType =
  | "overage"
  | "shortage"
  | "damaged"
  | "wrong"
  | "other";

export type ReceiveRejectResolution = "claim" | "return" | "accept_loss";

export type ReceiveRejectInput = {
  type: ReceiveRejectType;
  /** Required when type is "overage": keep the extras or send them back. */
  overage_type?: "receive" | "return" | null;
  resolution: ReceiveRejectResolution;
  qty: number;
  unit: PurchaseUnit;
  price: number;
  vat_rate: number;
  note: string;
  note_resolution: string;
  system_file_ids?: number[];
};

export type ReceiveRejectDetail = {
  id: number;
  purchase_order_item_id: number;
  sku: string;
  type: ReceiveRejectType;
  overage_type?: "receive" | "return" | null;
  resolution: ReceiveRejectResolution;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  qty: number;
  unit: PurchaseUnit;
  price: number;
  vat_rate: number;
  note: string;
  note_resolution: string;
  note_process: string;
  files: PurchaseItemFile[];
  created_at: string;
  created_by_name?: string | null;
  product_item_name?: string | null;
  product_item_sku?: string | null;
};

export type ReceivePlacementRow = {
  stock_id: number;
  bin_id: number;
  bin_sku: string;
  bin_name: string;
  path: string;
  quantity: number;
  free_gift: number;
  remain_quantity: number;
  cost_per_unit: number;
  sell_price: number;
  received_at?: string | null;
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  created_by?: string;
  supplier_user_id?: string;
  sort_by?: string;
  sort_order?: string;
  signal?: AbortSignal;
};

function listQuery(params: ListParams): string {
  const q = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ["page", params.page ? String(params.page) : undefined],
    ["limit", params.limit ? String(params.limit) : undefined],
    ["search", params.search],
    ["status", params.status],
    ["date_from", params.date_from],
    ["date_to", params.date_to],
    ["created_by", params.created_by],
    ["supplier_user_id", params.supplier_user_id],
    ["sort_by", params.sort_by],
    ["sort_order", params.sort_order],
  ];
  for (const [key, value] of entries) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchReceiveList(
  params: ListParams = {}
): Promise<PurchaseListResponse> {
  const res = await authFetch(`${PROXY_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseListResponse>;
}

export async function fetchReceiveCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {}
): Promise<PurchaseCountResponse> {
  const res = await authFetch(`${PROXY_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseCountResponse>;
}

export async function fetchReceiveDetail(id: number): Promise<PurchaseDetail> {
  const res = await authFetch(`${PROXY_BASE}/${id}`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseDetail>;
}

export async function fetchReceiveHistory(
  locale: string,
  id: number
): Promise<{ items: TicketHistoryEntry[] }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/history`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: TicketHistoryEntry[] }>;
}

export async function fetchReceiveRejects(
  id: number,
  signal?: AbortSignal
): Promise<{ items: ReceiveRejectDetail[] }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/rejects`, { signal });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: ReceiveRejectDetail[] }>;
}

/** Bins the placement picker may offer: free ones plus the ones already holding this item. */
export async function fetchReceiveBins(params: {
  product_item_id: number;
  search?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ items: ReceiveBinOption[] }> {
  const q = new URLSearchParams({
    product_item_id: String(params.product_item_id),
  });
  if (params.search) q.set("search", params.search);
  if (params.limit) q.set("limit", String(params.limit));
  const res = await authFetch(`${PROXY_BASE}/bins?${q}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: ReceiveBinOption[] }>;
}

export async function fetchReceivePlacements(
  id: number,
  itemId: number,
  signal?: AbortSignal
): Promise<{ items: ReceivePlacementRow[] }> {
  const res = await authFetch(
    `${PROXY_BASE}/${id}/items/${itemId}/placements`,
    { signal }
  );
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: ReceivePlacementRow[] }>;
}

export async function receiveItem(
  locale: string,
  id: number,
  itemId: number,
  body: ReceiveItemBody
): Promise<ReceiveItemResult> {
  const res = await authFetch(`${PROXY_BASE}/${id}/items/${itemId}/receive`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ReceiveItemResult>;
}

export async function createReceiveReject(
  locale: string,
  id: number,
  itemId: number,
  body: ReceiveRejectInput
): Promise<{ id: number }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/items/${itemId}/rejects`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function saveReceiveFiles(
  locale: string,
  id: number,
  systemFileIds: number[]
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/files`, {
    method: "PUT",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ system_file_ids: systemFileIds }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function convertReceiveItemUnit(
  locale: string,
  id: number,
  itemId: number,
  body: {
    qty_to_convert: number;
    from_ratio: number;
    to_ratio: number;
    target_unit: PurchaseUnit;
  }
): Promise<{ new_item_id: number; qty: number; source_deleted: boolean }> {
  const res = await authFetch(
    `${PROXY_BASE}/${id}/items/${itemId}/convert-unit`,
    {
      method: "POST",
      headers: bffJsonHeaders(locale),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{
    new_item_id: number;
    qty: number;
    source_deleted: boolean;
  }>;
}

export async function revertReceiveItemUnit(
  locale: string,
  id: number,
  itemId: number
): Promise<void> {
  const res = await authFetch(
    `${PROXY_BASE}/${id}/items/${itemId}/revert-convert-unit`,
    { method: "POST", headers: bffJsonHeaders(locale) }
  );
  if (!res.ok) throw await parseError(res);
}

export async function fetchReceiveFilters(
  params: {
    facet?: string;
    page?: number;
    limit?: number;
    search?: string;
    id?: number;
    extra?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<{ items: PurchaseFilterItem[] }> {
  const q = new URLSearchParams();
  if (params.facet) q.set("facet", params.facet);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.id) q.set("id", String(params.id));
  for (const [key, value] of Object.entries(params.extra ?? {})) {
    if (value) q.set(key, value);
  }
  const res = await authFetch(`${PROXY_BASE}/filters?${q}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: PurchaseFilterItem[] }>;
}

export async function loadReceiveFilterOptions(
  facet: string,
  params: { search: string; signal?: AbortSignal },
  extra?: Record<string, string>
): Promise<{ value: string; label: string }[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchReceiveFilters({
    facet: facet || undefined,
    page: 1,
    search: params.search.trim() || undefined,
    extra,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return res.items.map((row) => ({ value: String(row.id), label: row.name }));
}

export async function resolveReceiveFilterLabel(
  facet: string,
  value: string,
  extra?: Record<string, string>
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchReceiveFilters({
      facet: facet || undefined,
      id,
      limit: 1,
      extra,
    });
    return res.items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}
