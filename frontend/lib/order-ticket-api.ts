import { REMOTE_COMBOBOX_LIMIT } from "@/hooks/use-remote-combobox-options";
import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";

const PROXY_BASE = "/api/v1/auth/proxy/order/tickets";

export class OrderTicketApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderTicketApiError> {
  const e = await parseBffError(res);
  return new OrderTicketApiError(e.message, e.status, e.code);
}

export type TicketStatus =
  | "draft"
  | "pending"
  | "approved"
  | "received"
  | "completed"
  | "cancelled"
  | "rejected";

/** Line types: catalog = existing product_item, custom = not in the catalogue yet. */
export type TicketItemType = "catalog" | "custom";

export type TicketItemRejectType = "change" | "wait" | "stop" | "reject";

export type TicketItemRejectStatus = "pending" | "approved" | "cancelled";

export type TicketListItem = {
  id: number;
  sku: string;
  status: TicketStatus;
  total_qty: number;
  total_deposit: number;
  customer_name: string;
  created_at: string;
  created_by_name?: string | null;
  rejected_item_count: number;
  cancelled_item_count: number;
  approved_item_count: number;
  received_item_count: number;
  completed_item_count: number;
  pending_item_reject_count: number;
  purchase_order_count: number;
  all_items_have_po: boolean;
};

export type TicketListResponse = {
  items: TicketListItem[];
  total: number;
  page: number;
  limit: number;
};

export type TicketCountResponse = {
  count: number;
  by_status: Record<string, number>;
  by_item_status: Record<string, number>;
};

export type TicketCustomer = {
  member_user_id?: number | null;
  sku: string;
  name: string;
  tel: string;
  email: string;
  date_receive?: string | null;
};

export type TicketItemInput = {
  id?: number;
  type: TicketItemType;
  product_item_id?: number | null;
  name?: string | null;
  product_attribute_brand_id?: number | null;
  product_attribute_model_id?: number | null;
  product_attribute_engine_id?: number | null;
  identification_number: string;
  qty_sell: number;
  qty_reorder: number;
  deposit: number;
  unit: string;
  note: string;
  system_file_ids?: number[];
};

export type TicketItemFile = {
  id: number;
  system_file_id: number;
  sort_order: number;
  file_name?: string;
};

export type TicketItemReject = {
  id: number;
  purchase_request_item_id: number;
  status: TicketItemRejectStatus;
  type: TicketItemRejectType;
  note: string;
  date?: string | null;
  product_item_id?: number | null;
  product_item_name?: string | null;
  created_at: string;
  created_by_name?: string | null;
};

export type TicketItemDetail = {
  id: number;
  status: TicketStatus;
  type: TicketItemType;
  product_item_id?: number | null;
  product_item_sku?: string | null;
  product_item_name?: string | null;
  stock_qty: number;
  name?: string | null;
  product_attribute_brand_id?: number | null;
  brand_name?: string | null;
  product_attribute_model_id?: number | null;
  model_name?: string | null;
  product_attribute_engine_id?: number | null;
  engine_name?: string | null;
  identification_number: string;
  qty_sell: number;
  qty_reorder: number;
  deposit: number;
  unit: string;
  note: string;
  files: TicketItemFile[];
  rejects: TicketItemReject[];
  purchase_order_count: number;
};

export type TicketDetail = {
  id: number;
  sku: string;
  status: TicketStatus;
  setting_sale_channel_id?: number | null;
  setting_payment_method_id?: number | null;
  total_qty: number;
  total_deposit_old: number;
  total_deposit_new: number;
  total_deposit: number;
  note: string;
  customer?: TicketCustomer | null;
  items: TicketItemDetail[];
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
};

export type TicketSaveBody = {
  status: TicketStatus;
  setting_sale_channel_id?: number | null;
  setting_payment_method_id?: number | null;
  total_deposit_old: number;
  total_deposit_new: number;
  total_deposit: number;
  note: string;
  customer?: TicketCustomer | null;
  items: TicketItemInput[];
};

export type TicketHistoryEntry = {
  id: number;
  old_status?: string | null;
  new_status?: string | null;
  title: string;
  description: string;
  created_at: string;
  created_by_name?: string | null;
};

export type TicketFilterItem = { id: number; name: string; sku?: string };

export type TicketFiltersResponse = {
  items: TicketFilterItem[];
  meta: { total: number; page: number; limit: number };
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  created_by?: string;
  exclude_draft?: boolean;
  signal?: AbortSignal;
};

function listQuery(params: ListParams): string {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.created_by) q.set("created_by", params.created_by);
  if (params.exclude_draft) q.set("exclude_draft", "true");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchTicketList(
  params: ListParams = {}
): Promise<TicketListResponse> {
  const res = await authFetch(`${PROXY_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<TicketListResponse>;
}

export async function fetchTicketCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {}
): Promise<TicketCountResponse> {
  const res = await authFetch(`${PROXY_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<TicketCountResponse>;
}

export async function fetchTicketFilters(
  params: {
    facet?: string;
    page?: number;
    limit?: number;
    search?: string;
    id?: number;
    /** Facet-specific params, e.g. is_sale for payment_methods. */
    extra?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<TicketFiltersResponse> {
  const q = new URLSearchParams();
  if (params.facet) q.set("facet", params.facet);
  if (params.page) q.set("page", String(params.page));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search) q.set("search", params.search);
  if (params.id) q.set("id", String(params.id));
  for (const [key, value] of Object.entries(params.extra ?? {})) {
    if (value) q.set(key, value);
  }
  const res = await authFetch(`${PROXY_BASE}/filters?${q}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<TicketFiltersResponse>;
}

/** Seller/channel/payment comboboxes all ride `/filters`; facet "" is the seller list. */
export async function loadTicketFilterOptions(
  facet: string,
  params: { search: string; signal?: AbortSignal }
): Promise<{ value: string; label: string }[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchTicketFilters({
    facet: facet || undefined,
    page: 1,
    search: params.search.trim() || undefined,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return res.items.map((row) => ({ value: String(row.id), label: row.name }));
}

export async function resolveTicketFilterLabel(
  facet: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchTicketFilters({
      facet: facet || undefined,
      id,
      limit: 1,
    });
    return res.items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchTicketDetail(id: number): Promise<TicketDetail> {
  const res = await authFetch(`${PROXY_BASE}/${id}`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<TicketDetail>;
}

export async function fetchTicketHistory(
  locale: string,
  id: number
): Promise<{ items: TicketHistoryEntry[] }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/history`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: TicketHistoryEntry[] }>;
}

export async function createTicket(
  locale: string,
  body: TicketSaveBody
): Promise<{ id: number }> {
  const res = await authFetch(PROXY_BASE, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function updateTicket(
  locale: string,
  id: number,
  body: TicketSaveBody
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "PUT",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchTicketStatus(
  locale: string,
  id: number,
  status: TicketStatus
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchTicketCustomer(
  locale: string,
  id: number,
  customer: TicketCustomer
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/customer`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(customer),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchTicketNote(
  locale: string,
  id: number,
  note: string
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/note`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deleteTicket(locale: string, id: number): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "DELETE",
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchTicketItemStatus(
  locale: string,
  id: number,
  itemId: number,
  status: TicketStatus,
  reason?: string
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/items/${itemId}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function createTicketItemReject(
  locale: string,
  id: number,
  itemId: number,
  body: {
    type: TicketItemRejectType;
    note: string;
    date?: string | null;
    product_item_id?: number | null;
  }
): Promise<{ id: number }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/items/${itemId}/rejects`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function patchTicketItemRejectStatus(
  locale: string,
  id: number,
  rejectId: number,
  status: TicketItemRejectStatus
): Promise<void> {
  const res = await authFetch(
    `${PROXY_BASE}/${id}/item-rejects/${rejectId}/status`,
    {
      method: "PATCH",
      headers: bffJsonHeaders(locale),
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) throw await parseError(res);
}
