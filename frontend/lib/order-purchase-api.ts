import { REMOTE_COMBOBOX_LIMIT } from "@/hooks/use-remote-combobox-options";
import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

const PROXY_BASE = "/api/v1/auth/proxy/order/purchases";

export class OrderPurchaseApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderPurchaseApiError> {
  const e = await parseBffError(res);
  return new OrderPurchaseApiError(e.message, e.status, e.code);
}

export type PurchaseStatus =
  | "draft"
  | "pending"
  | "paying"
  | "completed"
  | "receive_partial"
  | "receive_completed"
  | "rejected"
  | "cancelled";

export type PurchaseItemStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "receive_approved"
  | "receive_rejected";

export type PurchaseItemType = "catalog" | "custom";

export type PurchaseVatType = "include" | "exclude" | "none";

export type PurchaseUnit = "piece" | "box" | "set";

export type PurchaseTotals = {
  total_price: number;
  total_discount: number;
  total_price_discount: number;
  total_vat: number;
  total_price_vat: number;
  total_grand_price: number;
};

export type PurchaseListItem = PurchaseTotals & {
  id: number;
  sku?: string | null;
  sku_draft?: string | null;
  status: PurchaseStatus;
  is_waiting: boolean;
  supplier_user_id?: number | null;
  supplier_name?: string | null;
  supplier_sku?: string | null;
  purchase_request_id?: number | null;
  purchase_request_sku?: string | null;
  request_created_by_name?: string | null;
  total_qty: number;
  approved_item_count: number;
  item_reject_count: number;
  claim_reject_count: number;
  vat_type: PurchaseVatType;
  vat_rate: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
};

export type PurchaseListResponse = {
  items: PurchaseListItem[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseCountResponse = {
  count: number;
  by_status: Record<string, number>;
  by_item_status: Record<string, number>;
  sum_total_ex_vat: number;
  sum_total_vat: number;
  sum_outstanding_debt: number;
};

/** Pseudo status for the "สั่งซื้อแล้ว" chip: completed + both receive states in one filter. */
export const PURCHASE_ORDERED_STATUS_FILTER = "ordered";

export type PurchaseItemFile = {
  id: number;
  system_file_id: number;
  sort_order: number;
};

export type PurchaseItemInput = {
  id?: number;
  purchase_request_item_id?: number | null;
  type: PurchaseItemType;
  product_item_id?: number | null;
  name?: string | null;
  product_attribute_brand_id?: number | null;
  product_attribute_model_id?: number | null;
  product_attribute_engine_id?: number | null;
  identification_number: string;
  qty: number;
  free_gift: number;
  unit: PurchaseUnit;
  price_per_unit: number;
  vat_rate: number;
  discount: number;
  note: string;
  system_file_ids?: number[];
};

export type PurchaseItemDetail = {
  id: number;
  purchase_order_id: number;
  purchase_request_item_id?: number | null;
  parent_id?: number | null;
  status: PurchaseItemStatus;
  type: PurchaseItemType;
  product_item_id?: number | null;
  product_item_sku?: string | null;
  product_item_name?: string | null;
  code_barcode?: string | null;
  code_qrcode?: string | null;
  name?: string | null;
  product_attribute_brand_id?: number | null;
  brand_name?: string | null;
  product_attribute_model_id?: number | null;
  model_name?: string | null;
  product_attribute_engine_id?: number | null;
  engine_name?: string | null;
  identification_number: string;
  qty: number;
  free_gift: number;
  unit: PurchaseUnit;
  old_qty?: number | null;
  old_unit?: PurchaseUnit | null;
  price_per_unit: number;
  vat_rate: number;
  discount: number;
  total_price: number;
  total_price_vat: number;
  note: string;
  received_qty: number;
  files: PurchaseItemFile[];
  created_at: string;
  updated_at: string;
};

export type PurchasePayment = {
  id: number;
  purchase_order_id: number;
  setting_payment_method_id: number;
  payment_method_name?: string | null;
  supplier_bank_id?: number | null;
  supplier_bank_name?: string | null;
  vat_rate: number;
  discount: number;
  total_price: number;
  note: string;
  system_file_id?: number | null;
  credit_term?: number | null;
  paid_at?: string | null;
  created_at: string;
  created_by_name?: string | null;
};

export type PurchasePaymentInput = {
  setting_payment_method_id: number;
  supplier_bank_id?: number | null;
  vat_rate: number;
  discount: number;
  total_price: number;
  note: string;
  system_file_id?: number | null;
  credit_term?: number | null;
  paid_at?: string | null;
};

export type PurchaseDetail = PurchaseTotals & {
  id: number;
  sku?: string | null;
  sku_draft?: string | null;
  status: PurchaseStatus;
  is_waiting: boolean;
  supplier_user_id?: number | null;
  supplier_name?: string | null;
  purchase_request_id?: number | null;
  purchase_request_sku?: string | null;
  request_created_by_name?: string | null;
  ordered_at: string;
  vat_type: PurchaseVatType;
  vat_rate: number;
  discount: number;
  special_discount: number;
  total_qty: number;
  note: string;
  items: PurchaseItemDetail[];
  payments: PurchasePayment[];
  files: PurchaseItemFile[];
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
};

export type PurchaseSaveBody = {
  status: PurchaseStatus;
  supplier_user_id?: number | null;
  purchase_request_id?: number | null;
  ordered_at?: string | null;
  vat_type: PurchaseVatType;
  vat_rate: number;
  discount: number;
  special_discount: number;
  is_waiting?: boolean;
  note: string;
  items: PurchaseItemInput[];
};

/** Take `qty_to_convert` off a line and re-express it: from_ratio old units = to_ratio new ones. */
export type PurchaseConvertUnitBody = {
  qty_to_convert: number;
  from_ratio: number;
  to_ratio: number;
  target_unit: PurchaseUnit;
};

export type PurchaseConvertUnitResult = {
  new_item_id: number;
  qty: number;
  source_deleted: boolean;
};

export type PurchaseStockHistoryRow = {
  id: number;
  product_item_id: number;
  product_item_name?: string | null;
  purchase_order_id?: number | null;
  purchase_order_sku?: string | null;
  supplier_user_id?: number | null;
  supplier_name?: string | null;
  quantity: number;
  remain_quantity: number;
  cost_per_unit: number;
  discount_per_unit: number;
  sell_price: number;
  received_at?: string | null;
  created_at: string;
};

export type PurchaseFilterItem = {
  id: number;
  name: string;
  sku?: string;
  /** supplier_banks only: the payee details the payment form shows after a bank is picked. */
  account_name?: string;
  branch?: string;
};

export type PurchaseFiltersResponse = {
  items: PurchaseFilterItem[];
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
  supplier_user_id?: string;
  purchase_request_id?: string;
  grand_total_min?: string;
  grand_total_max?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  signal?: AbortSignal;
};

function listQuery(params: ListParams): string {
  const q = new URLSearchParams();
  const entries: [keyof ListParams, string | undefined][] = [
    ["page", params.page ? String(params.page) : undefined],
    ["limit", params.limit ? String(params.limit) : undefined],
    ["search", params.search],
    ["status", params.status],
    ["date_from", params.date_from],
    ["date_to", params.date_to],
    ["created_by", params.created_by],
    ["supplier_user_id", params.supplier_user_id],
    ["purchase_request_id", params.purchase_request_id],
    ["grand_total_min", params.grand_total_min],
    ["grand_total_max", params.grand_total_max],
    ["sort_by", params.sort_by],
    ["sort_order", params.sort_order],
  ];
  for (const [key, value] of entries) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchPurchaseList(
  params: ListParams = {}
): Promise<PurchaseListResponse> {
  const res = await authFetch(`${PROXY_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseListResponse>;
}

export async function fetchPurchaseCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {}
): Promise<PurchaseCountResponse> {
  const res = await authFetch(`${PROXY_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseCountResponse>;
}

export async function fetchPurchaseFilters(
  params: {
    facet?: string;
    page?: number;
    limit?: number;
    search?: string;
    id?: number;
    /** Facet-specific params, e.g. supplier_user_id for supplier_banks, is_purchase for methods. */
    extra?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<PurchaseFiltersResponse> {
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
  return res.json() as Promise<PurchaseFiltersResponse>;
}

/** Buyer/supplier/payment comboboxes all ride `/filters`; facet "" is the buyer list. */
export async function loadPurchaseFilterOptions(
  facet: string,
  params: { search: string; signal?: AbortSignal },
  extra?: Record<string, string>
): Promise<{ value: string; label: string }[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchPurchaseFilters({
    facet: facet || undefined,
    page: 1,
    search: params.search.trim() || undefined,
    extra,
    signal: params.signal,
  });
  if (params.signal?.aborted) return [];
  return res.items.map((row) => ({ value: String(row.id), label: row.name }));
}

export async function resolvePurchaseFilterLabel(
  facet: string,
  value: string,
  extra?: Record<string, string>
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchPurchaseFilters({
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

export async function fetchPurchaseDetail(id: number): Promise<PurchaseDetail> {
  const res = await authFetch(`${PROXY_BASE}/${id}`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseDetail>;
}

export async function fetchPurchaseHistory(
  locale: string,
  id: number
): Promise<{ items: TicketHistoryEntry[] }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/history`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: TicketHistoryEntry[] }>;
}

export async function fetchPurchaseStockHistory(params: {
  product_item_id: number;
  supplier_user_id?: number | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ items: PurchaseStockHistoryRow[] }> {
  const q = new URLSearchParams({
    product_item_id: String(params.product_item_id),
  });
  if (params.supplier_user_id)
    q.set("supplier_user_id", String(params.supplier_user_id));
  if (params.limit) q.set("limit", String(params.limit));
  const res = await authFetch(`${PROXY_BASE}/stock-history?${q}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: PurchaseStockHistoryRow[] }>;
}

export async function createPurchase(
  locale: string,
  body: PurchaseSaveBody
): Promise<{ id: number }> {
  const res = await authFetch(PROXY_BASE, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function updatePurchase(
  locale: string,
  id: number,
  body: PurchaseSaveBody
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "PUT",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchPurchaseStatus(
  locale: string,
  id: number,
  status: PurchaseStatus,
  note?: string
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchPurchaseWaiting(
  locale: string,
  id: number,
  isWaiting: boolean
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/waiting`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ is_waiting: isWaiting }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deletePurchase(
  locale: string,
  id: number
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "DELETE",
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
}

export async function updatePurchaseItem(
  locale: string,
  id: number,
  itemId: number,
  body: PurchaseItemInput
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/items/${itemId}`, {
    method: "PUT",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchPurchaseItemStatus(
  locale: string,
  id: number,
  itemId: number,
  status: PurchaseItemStatus,
  note?: string
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/items/${itemId}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function convertPurchaseItemUnit(
  locale: string,
  id: number,
  itemId: number,
  body: PurchaseConvertUnitBody
): Promise<PurchaseConvertUnitResult> {
  const res = await authFetch(
    `${PROXY_BASE}/${id}/items/${itemId}/convert-unit`,
    {
      method: "POST",
      headers: bffJsonHeaders(locale),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PurchaseConvertUnitResult>;
}

export async function revertPurchaseItemUnit(
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

export async function createPurchasePayment(
  locale: string,
  id: number,
  body: PurchasePaymentInput
): Promise<{ id: number }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/payments`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function deletePurchasePayment(
  locale: string,
  id: number,
  paymentId: number
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/payments/${paymentId}`, {
    method: "DELETE",
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
}

export async function savePurchaseFiles(
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
