/**
 * Client for /api/v1/order/claims — the purchase-side desk that chases the supplier over what arrived
 * wrong. One claim is one receipt discrepancy (`purchase_order_item_reject`), which is how v1 listed
 * them too; its `type_reject` is this schema's `resolution`, with "reject" being `accept_loss`.
 */

import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";
import type {
  PurchaseDetail,
  PurchaseItemDetail,
  PurchaseItemFile,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";
import type {
  ReceiveRejectResolution,
  ReceiveRejectType,
} from "@/lib/order-receive-api";

const PROXY_BASE = "/api/v1/auth/proxy/order/claims";

export class OrderClaimApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderClaimApiError> {
  const e = await parseBffError(res);
  return new OrderClaimApiError(e.message, e.status, e.code);
}

export type ClaimStatus = "pending" | "in_progress" | "completed" | "cancelled";

/** "" is the all-chip. */
export type ClaimStatusFilter = ClaimStatus | "";

/** v1's `type_reject`: claim / return / reject, where "reject" writes the loss off. */
export const CLAIM_WRITE_OFF: ReceiveRejectResolution = "accept_loss";

export const CLAIM_RESOLUTIONS: ReceiveRejectResolution[] = [
  "claim",
  "return",
  CLAIM_WRITE_OFF,
];

export type ClaimListItem = {
  id: number;
  purchase_order_id?: number | null;
  purchase_order_item_id: number;
  sku: string;
  purchase_order_sku?: string | null;
  type: ReceiveRejectType;
  overage_type?: "receive" | "return" | null;
  resolution: ReceiveRejectResolution;
  status: ClaimStatus;
  qty: number;
  unit: string;
  price: number;
  vat_rate: number;
  note: string;
  note_resolution: string;
  note_process: string;
  supplier_name?: string | null;
  created_by_name?: string | null;
  product_item_name?: string | null;
  product_item_sku?: string | null;
  purchase_claim_id?: number | null;
  purchase_claim_sku?: string | null;
  purchase_claim_status?: "draft" | "success" | "cancelled" | null;
  created_at: string;
};

export type ClaimListResponse = {
  items: ClaimListItem[];
  total: number;
  page: number;
  limit: number;
};

export type ClaimCountResponse = {
  count: number;
  by_status: Record<string, number>;
};

export type ClaimDetail = ClaimListItem & {
  files: PurchaseItemFile[];
  order?: PurchaseDetail | null;
  item?: PurchaseItemDetail | null;
  siblings: ClaimListItem[];
};

export type ClaimUpdateInput = {
  resolution?: ReceiveRejectResolution;
  status?: ClaimStatus;
  note_resolution?: string;
  note_process?: string;
};

export type ClaimUpdateResult = {
  id: number;
  status: ClaimStatus;
  resolution: ReceiveRejectResolution;
  purchase_claim_id?: number | null;
  claim_sku?: string | null;
  restored_item_qty?: number | null;
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  resolution?: string;
  date_from?: string;
  date_to?: string;
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
    ["resolution", params.resolution],
    ["date_from", params.date_from],
    ["date_to", params.date_to],
    ["sort_by", params.sort_by],
    ["sort_order", params.sort_order],
  ];
  for (const [key, value] of entries) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchClaimList(
  params: ListParams = {}
): Promise<ClaimListResponse> {
  const res = await authFetch(`${PROXY_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ClaimListResponse>;
}

export async function fetchClaimCount(
  params: Omit<ListParams, "page" | "limit" | "status"> = {}
): Promise<ClaimCountResponse> {
  const res = await authFetch(`${PROXY_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ClaimCountResponse>;
}

export async function fetchClaimDetail(id: number): Promise<ClaimDetail> {
  const res = await authFetch(`${PROXY_BASE}/${id}`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ClaimDetail>;
}

export async function fetchClaimHistory(
  locale: string,
  id: number
): Promise<{ items: TicketHistoryEntry[] }> {
  const res = await authFetch(`${PROXY_BASE}/${id}/history`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ items: TicketHistoryEntry[] }>;
}

export async function updateClaim(
  locale: string,
  id: number,
  body: ClaimUpdateInput
): Promise<ClaimUpdateResult> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "PUT",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ClaimUpdateResult>;
}
