import { authFetch } from "@/lib/auth-client";
import { BffApiError, bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";

export { BffApiError as OrderStoreClaimApiError };

const CLAIM_BASE = "/api/v1/auth/proxy/order/store-claims";
const LIST_BASE = "/api/v1/auth/proxy/order/store-claim-lists";

async function parseError(res: Response): Promise<BffApiError> {
  return parseBffError(res);
}

export type StoreClaimType = "claim" | "return";

export type StoreClaimPaymentType = "cash" | "transfer" | "other" | "debt_reduction";

/** order_claim_status, the workflow the purchasing side drives after the shop files a document. */
export type StoreClaimStatus =
  | "pending"
  | "acknowledged"
  | "waiting_supplier"
  | "success"
  | "cancelled"
  | "rejected";

export type StoreClaimStatusFilter = StoreClaimStatus | "";

export type StoreClaimPaymentListItem = {
  id: number;
  sku?: string;
  order_list_id: number;
  order_sku?: string;
  payment_category: "credit" | "payment";
  member_name?: string | null;
  total_price: number;
  created_by_name?: string | null;
  created_at: string;
};

export type StoreClaimPaymentListResponse = {
  items: StoreClaimPaymentListItem[];
  total: number;
  page: number;
  limit: number;
};

export type StoreClaimPaymentLine = {
  id: number;
  order_list_item_id: number;
  product_item_id?: number | null;
  detail?: string | null;
  amount: number;
  price_per_unit: number;
  discount: number;
  total_price: number;
  /** What live claims already took off this line; the form caps the quantity with it. */
  claimed_amount: number;
};

export type StoreClaimPaymentMethod = {
  id: number;
  setting_payment_method_id: number;
  name?: string | null;
  amount: number;
};

export type StoreClaimPaymentDetail = {
  id: number;
  sku?: string;
  order_list_id: number;
  order_sku?: string;
  payment_category: "credit" | "payment";
  total_price: number;
  amount_paid: number;
  is_paid: boolean;
  member_user_id?: number | null;
  member_name?: string | null;
  member_tel?: string | null;
  member_email?: string | null;
  created_by_name?: string | null;
  created_at: string;
  order_created_at?: string | null;
  delivery_at?: string | null;
  lines: StoreClaimPaymentLine[];
  methods: StoreClaimPaymentMethod[];
};

export type StoreClaimItemDetail = {
  id: number;
  order_payment_item_id: number;
  order_list_item_id: number;
  product_item_id?: number | null;
  type: StoreClaimType;
  setting_claim_reason_id: number;
  reason_name?: string;
  amount: number;
  status: StoreClaimStatus;
  note: string;
};

export type StoreClaimDetail = {
  id: number;
  sku?: string;
  order_payment_id: number;
  type: StoreClaimType;
  payment_type: StoreClaimPaymentType;
  other_reason: string;
  total_price: number;
  status: StoreClaimStatus;
  created_at: string;
  items: StoreClaimItemDetail[];
};

export type StoreClaimCreateBody = {
  type: StoreClaimType;
  payment_type: StoreClaimPaymentType;
  other_reason: string;
  total_price: number;
  items: {
    order_payment_item_id: number;
    type: StoreClaimType;
    setting_claim_reason_id: number;
    amount: number;
    note: string;
  }[];
};

export type StoreClaimListItem = {
  id: number;
  sku?: string;
  type: StoreClaimType;
  status: StoreClaimStatus;
  payment_type: StoreClaimPaymentType;
  total_price: number;
  order_payment_id: number;
  payment_sku?: string;
  order_list_id: number;
  member_name?: string | null;
  created_at: string;
};

export type StoreClaimListResponse = {
  items: StoreClaimListItem[];
  total: number;
  page: number;
  limit: number;
};

export type StoreClaimCountResponse = {
  count: number;
  by_status: Record<string, number>;
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  payment_category?: string;
  type?: string;
  status?: string;
  signal?: AbortSignal;
};

function listQuery(params: ListParams): string {
  const q = new URLSearchParams();
  const entries: [string, string | undefined][] = [
    ["page", params.page ? String(params.page) : undefined],
    ["limit", params.limit ? String(params.limit) : undefined],
    ["search", params.search],
    ["date_from", params.date_from],
    ["date_to", params.date_to],
    ["payment_category", params.payment_category],
    ["type", params.type],
    ["status", params.status],
  ];
  for (const [key, value] of entries) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchStoreClaimPayments(
  params: ListParams = {}
): Promise<StoreClaimPaymentListResponse> {
  const res = await authFetch(`${CLAIM_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<StoreClaimPaymentListResponse>;
}

export async function fetchStoreClaimPayment(
  paymentId: number
): Promise<StoreClaimPaymentDetail> {
  const res = await authFetch(`${CLAIM_BASE}/${paymentId}`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<StoreClaimPaymentDetail>;
}

export async function fetchStoreClaims(
  paymentId: number
): Promise<{ items: StoreClaimDetail[] }> {
  const res = await authFetch(`${CLAIM_BASE}/${paymentId}/claims`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: StoreClaimDetail[] }>;
}

export async function createStoreClaim(
  locale: string,
  paymentId: number,
  body: StoreClaimCreateBody
): Promise<{ id: number }> {
  const res = await authFetch(`${CLAIM_BASE}/${paymentId}/claims`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function fetchStoreClaimList(
  params: ListParams = {}
): Promise<StoreClaimListResponse> {
  const res = await authFetch(`${LIST_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<StoreClaimListResponse>;
}

export async function fetchStoreClaimCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {}
): Promise<StoreClaimCountResponse> {
  const res = await authFetch(`${LIST_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<StoreClaimCountResponse>;
}

export async function deleteStoreClaim(id: number): Promise<void> {
  const res = await authFetch(`${LIST_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseError(res);
}
