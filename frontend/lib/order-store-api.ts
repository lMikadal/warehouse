import { REMOTE_COMBOBOX_LIMIT } from "@/hooks/use-remote-combobox-options";
import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  parseBffError,
  type BffListMeta,
} from "@/lib/bff-crud-client";

const PROXY_BASE = "/api/v1/auth/proxy/order/store-sales";

export class OrderStoreApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderStoreApiError> {
  const e = await parseBffError(res);
  return new OrderStoreApiError(e.message, e.status, e.code);
}

export type StoreSalesStatus =
  | "draft"
  | "pending"
  | "success"
  | "cancelled"
  | "rejected";

export type StoreSalesListItem = {
  id: number;
  sku?: string;
  status: StoreSalesStatus;
  ordered_at?: string | null;
  parent_id?: number | null;
  member_name?: string | null;
  item_count: number;
  total_price: number;
  child_count: number;
  created_at: string;
  created_by_name?: string | null;
};

export type StoreSalesListResponse = {
  items: StoreSalesListItem[];
  total: number;
  page: number;
  limit: number;
};

export type StoreSalesCountResponse = {
  count: number;
  by_status: Record<string, number>;
};

export type StoreSalesShippingInput = {
  type: "store" | "parking" | "delivery";
  received_at?: string | null;
};

export type StoreSalesItemInput = {
  product_item_id?: number | null;
  type: "item" | "compare";
  amount: number;
  price_per_unit: number;
  discount: number;
  detail?: string | null;
};

export type StoreSalesCreateBody = {
  status: StoreSalesStatus;
  parent_id?: number | null;
  member_user_id?: number | null;
  member_setting_credit_id?: number | null;
  member_name?: string | null;
  member_tel?: string | null;
  member_email?: string | null;
  shipping?: StoreSalesShippingInput;
  items: StoreSalesItemInput[];
};

export type StoreSalesItemDetail = {
  id?: number;
  product_item_id?: number | null;
  type: "item" | "compare";
  amount: number;
  price_per_unit: number;
  discount: number;
  total_price?: number;
  detail?: string | null;
};

export type StoreSalesDetail = Omit<StoreSalesCreateBody, "items"> & {
  id: number;
  sku?: string;
  fulfill_status: string;
  ordered_at?: string | null;
  items?: StoreSalesItemDetail[];
  family?: StoreSalesListItem[];
  created_at: string;
  updated_at: string;
};

export type StoreSalesFilterItem = { id: number; name: string };

export type StoreSalesFiltersResponse = {
  items: StoreSalesFilterItem[];
  meta?: BffListMeta;
};

export type StoreSalesFiltersParams = {
  page?: number;
  limit?: number;
  search?: string;
  id?: number;
};

export async function fetchStoreSalesList(
  locale: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    created_by?: string;
  }
): Promise<StoreSalesListResponse> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.status) qs.set("status", params.status);
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.created_by) qs.set("created_by", params.created_by);
  const res = await authFetch(`${PROXY_BASE}?${qs}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as StoreSalesListResponse;
}

export async function fetchStoreSalesCount(
  locale: string,
  params: Omit<
    Parameters<typeof fetchStoreSalesList>[1],
    "page" | "limit"
  >
): Promise<StoreSalesCountResponse> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.status) qs.set("status", params.status);
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.created_by) qs.set("created_by", params.created_by);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await authFetch(`${PROXY_BASE}/count${suffix}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as StoreSalesCountResponse;
}

export async function fetchStoreSalesFilters(
  locale: string,
  params: StoreSalesFiltersParams & { signal?: AbortSignal } = {}
): Promise<StoreSalesFiltersResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.id != null && params.id > 0) q.set("id", String(params.id));
  const res = await authFetch(`${PROXY_BASE}/filters?${q}`, {
    headers: bffJsonHeaders(locale),
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as StoreSalesFiltersResponse;
}

export async function fetchStoreSalesDetail(
  locale: string,
  id: number
): Promise<StoreSalesDetail> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as StoreSalesDetail;
}

export async function createStoreSales(
  locale: string,
  body: StoreSalesCreateBody
): Promise<{ id: number }> {
  const res = await authFetch(PROXY_BASE, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { id: number };
}

export async function updateStoreSales(
  locale: string,
  id: number,
  body: StoreSalesCreateBody
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchStoreSalesStatus(
  locale: string,
  id: number,
  status: StoreSalesStatus
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchStoreSalesShipping(
  locale: string,
  id: number,
  shipping: StoreSalesShippingInput
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/shipping`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(shipping),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deleteStoreSales(
  locale: string,
  id: number
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "DELETE",
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
}

export { BffApiError };
