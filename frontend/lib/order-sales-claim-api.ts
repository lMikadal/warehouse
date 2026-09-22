import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  parseBffError,
} from "@/lib/bff-crud-client";
import type {
  StoreClaimCountResponse,
  StoreClaimListResponse,
  StoreClaimPaymentType,
  StoreClaimStatus,
  StoreClaimType,
} from "@/lib/order-store-claim-api";

export { BffApiError as OrderSalesClaimApiError };

const BASE = "/api/v1/auth/proxy/order/sales-claims";

/** The line-level verdict purchasing records: accepted, or turned down. */
export type SalesClaimItemReview = "success" | "rejected";

export type SalesClaimItemDetail = {
  id: number;
  order_payment_item_id: number;
  order_list_item_id: number;
  product_item_id?: number | null;
  detail?: string | null;
  type: StoreClaimType;
  setting_claim_reason_id: number;
  reason_name?: string;
  amount: number;
  price_per_unit: number;
  discount: number;
  paid_amount: number;
  paid_total_price: number;
  status: StoreClaimStatus;
  note: string;
};

export type SalesClaimDetail = {
  id: number;
  sku?: string;
  type: StoreClaimType;
  status: StoreClaimStatus;
  payment_type: StoreClaimPaymentType;
  other_reason: string;
  total_price: number;
  order_payment_id: number;
  payment_sku?: string;
  payment_category: "credit" | "payment";
  payment_total_price: number;
  order_list_id: number;
  order_sku?: string;
  member_name?: string | null;
  member_tel?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  created_at: string;
  updated_at: string;
  items: SalesClaimItemDetail[];
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
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
  ];
  for (const [key, value] of entries) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchSalesClaimList(
  params: ListParams = {},
): Promise<StoreClaimListResponse> {
  const res = await authFetch(`${BASE}${listQuery(params)}`);
  if (!res.ok) throw await parseBffError(res);
  return res.json() as Promise<StoreClaimListResponse>;
}

export async function fetchSalesClaimCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {},
): Promise<StoreClaimCountResponse> {
  const res = await authFetch(`${BASE}/count${listQuery(params)}`);
  if (!res.ok) throw await parseBffError(res);
  return res.json() as Promise<StoreClaimCountResponse>;
}

export async function fetchSalesClaimDetail(
  locale: string,
  id: number,
): Promise<SalesClaimDetail> {
  const res = await authFetch(`${BASE}/${id}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return res.json() as Promise<SalesClaimDetail>;
}

export async function patchSalesClaimStatus(
  locale: string,
  id: number,
  status: StoreClaimStatus,
): Promise<void> {
  const res = await authFetch(`${BASE}/${id}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseBffError(res);
}

export async function patchSalesClaimItem(
  locale: string,
  id: number,
  itemId: number,
  body: { status?: SalesClaimItemReview; note?: string },
): Promise<void> {
  const res = await authFetch(`${BASE}/${id}/items/${itemId}`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseBffError(res);
}

export async function deleteSalesClaim(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseBffError(res);
}
