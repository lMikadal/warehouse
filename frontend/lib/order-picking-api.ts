/**
 * Client for /api/v1/order/orders — the picking desk (ใบจัดสินค้า). One slip is one `order_list` row:
 * v1 split the same document over a "bill" and an "order", so its two ids are one id here, and its
 * order status (wait/in_progress/success/fail) is this schema's `fulfill_status`.
 */

import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";

const PROXY_BASE = "/api/v1/auth/proxy/order/orders";

export class OrderPickingApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderPickingApiError> {
  const e = await parseBffError(res);
  return new OrderPickingApiError(e.message, e.status, e.code);
}

/** v1: wait → pending. */
export type PickingStatus = "pending" | "in_progress" | "success" | "fail";

/** "" is the all-chip. */
export type PickingStatusFilter = PickingStatus | "";

export const PICKING_STATUSES: PickingStatus[] = [
  "pending",
  "in_progress",
  "success",
  "fail",
];

/** Per-line goods-out status. The sale document owns cancelled/rejected, the picker never sets them. */
export type PickingItemStatus = "pending" | "in_progress" | "success";

export type PickingListItem = {
  id: number;
  sku?: string;
  status: PickingStatus;
  doc_status: string;
  parent_id?: number | null;
  member_name?: string | null;
  item_count: number;
  piece_count: number;
  total_price: number;
  payment_count: number;
  payment_sku?: string | null;
  ordered_at?: string | null;
  created_at: string;
  created_by_name?: string | null;
  updated_at?: string | null;
  updated_by_name?: string | null;
};

export type PickingListResponse = {
  items: PickingListItem[];
  total: number;
  page: number;
  limit: number;
};

export type PickingCountResponse = {
  count: number;
  by_status: Record<string, number>;
};

export type PickingItemDetail = {
  id: number;
  product_item_id?: number | null;
  type: "item" | "compare";
  amount: number;
  amount_picked: number;
  amount_checked: number;
  status: PickingItemStatus;
  price_per_unit: number;
  discount: number;
  vat_type: string;
  vat_rate: number;
  total_price: number;
  detail?: string | null;
  warehouse_list_id?: number | null;
};

export type PickingShipping = {
  type: "store" | "parking" | "delivery";
  received_at?: string | null;
};

export type PickingOrderDetail = {
  id: number;
  sku?: string;
  status: PickingStatus;
  doc_status: string;
  parent_id?: number | null;
  member_user_id?: number | null;
  member_setting_credit_id?: number | null;
  member_name?: string | null;
  member_tel?: string | null;
  member_email?: string | null;
  vat_type: string;
  vat_rate: number;
  ordered_at?: string | null;
  shipping?: PickingShipping | null;
  items: PickingItemDetail[];
  created_at: string;
  created_by?: number | null;
  created_by_name?: string | null;
};

export type PickingFamilyResponse = {
  root_id: number;
  orders: PickingOrderDetail[];
};

export type PickingItemPatchBody = {
  amount_checked?: number;
  status?: PickingItemStatus;
  product_item_id?: number;
  warehouse_list_id?: number;
};

export type PickingPaymentCategory = "credit" | "payment";

export type PickingPaymentMethodInput = {
  setting_payment_method_id: number;
  amount: number;
};

export type PickingPaymentItemInput = {
  order_list_item_id: number;
  amount: number;
  price_per_unit: number;
  discount: number;
  total_price: number;
};

export type PickingPaymentSaveBody = {
  payment_category: PickingPaymentCategory;
  ordered_at?: string;
  vat_rate: number;
  discount: number;
  special_discount: number;
  total_price: number;
  is_paid: boolean;
  credit_approved_by?: number;
  discount_approved_by?: number;
  methods: PickingPaymentMethodInput[];
  /** Omit to keep the priced snapshot as it is; that is what the draft save relies on. */
  items?: PickingPaymentItemInput[];
};

export type PickingPaymentMethodDetail = {
  id: number;
  setting_payment_method_id: number;
  name?: string | null;
  amount: number;
};

export type PickingPaymentItemDetail = {
  id: number;
  order_list_item_id: number;
  amount: number;
  vat_rate: number;
  price_per_unit: number;
  discount: number;
  total_price: number;
};

export type PickingPaymentDetail = {
  id: number;
  order_list_id: number;
  sku?: string;
  payment_category: PickingPaymentCategory;
  ordered_at: string;
  vat_rate: number;
  discount: number;
  special_discount: number;
  total_price: number;
  amount_paid: number;
  /** Generated from amount_paid >= total_price; the payment screen reads it as v1's "pay in full". */
  is_full: boolean;
  is_paid: boolean;
  credit_approved_by?: number | null;
  discount_approved_by?: number | null;
  methods: PickingPaymentMethodDetail[];
  items: PickingPaymentItemDetail[];
  created_at: string;
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  created_by?: number;
  /** The list only ever shows family roots; children appear as expandable payment rows. */
  root_only?: boolean;
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
    ["created_by", params.created_by ? String(params.created_by) : undefined],
    ["root_only", params.root_only === false ? "0" : undefined],
  ];
  for (const [key, value] of entries) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchPickingList(
  params: ListParams = {}
): Promise<PickingListResponse> {
  const res = await authFetch(`${PROXY_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PickingListResponse>;
}

export async function fetchPickingCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {}
): Promise<PickingCountResponse> {
  const res = await authFetch(`${PROXY_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PickingCountResponse>;
}

export async function fetchPickingFamily(
  id: number
): Promise<PickingFamilyResponse> {
  const res = await authFetch(`${PROXY_BASE}/${id}/family`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PickingFamilyResponse>;
}

export async function fetchPickingPayments(
  id: number
): Promise<{ items: PickingPaymentDetail[] }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/payments`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: PickingPaymentDetail[] }>;
}

export async function patchPickingItem(
  locale: string,
  orderId: number,
  itemId: number,
  body: PickingItemPatchBody
): Promise<PickingItemDetail> {
  const res = await authFetch(`${PROXY_BASE}/${orderId}/items/${itemId}`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PickingItemDetail>;
}

export async function patchPickingStatus(
  locale: string,
  id: number,
  status: PickingStatus
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchPickingShipping(
  locale: string,
  id: number,
  body: PickingShipping
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/shipping`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export type PickingExtraOrderBody = {
  parent_id: number;
  member_user_id?: number | null;
  member_setting_credit_id?: number | null;
  member_name?: string | null;
  member_tel?: string | null;
  member_email?: string | null;
  items: {
    product_item_id?: number;
    type: "item" | "compare";
    amount: number;
    price_per_unit: number;
    discount: number;
    detail?: string;
  }[];
};

export async function createPickingExtraOrder(
  locale: string,
  body: PickingExtraOrderBody
): Promise<{ id: number }> {
  const res = await authFetch(PROXY_BASE, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status: "draft", ...body }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function savePickingPayment(
  locale: string,
  orderId: number,
  paymentId: number | null,
  body: PickingPaymentSaveBody
): Promise<PickingPaymentDetail> {
  const path =
    paymentId && paymentId > 0
      ? `${PROXY_BASE}/${orderId}/payments/${paymentId}`
      : `${PROXY_BASE}/${orderId}/payments`;
  const res = await authFetch(path, {
    method: paymentId && paymentId > 0 ? "PATCH" : "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PickingPaymentDetail>;
}

/** kind "credit" needs a superadmin PIN (v1 verify-superadmin); "discount" any discount approver. */
export async function verifyPickingApproval(
  locale: string,
  kind: "credit" | "discount",
  code: string
): Promise<{ user_id: number }> {
  const res = await authFetch(`${PROXY_BASE}/verify-${kind}`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ user_id: number }>;
}
