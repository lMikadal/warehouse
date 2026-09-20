import { REMOTE_COMBOBOX_LIMIT } from "@/hooks/use-remote-combobox-options";
import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";

const PROXY_BASE = "/api/v1/auth/proxy/order/quotations";

export class OrderQuotationApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderQuotationApiError> {
  const e = await parseBffError(res);
  return new OrderQuotationApiError(e.message, e.status, e.code);
}

export type QuotationStatus =
  | "draft"
  | "pending"
  | "approved"
  | "success"
  | "cancelled"
  | "rejected";

export type QuotationAcceptMode = "payment" | "credit";

export type QuotationListItem = {
  id: number;
  sku?: string;
  status: QuotationStatus;
  member_name?: string | null;
  grand_total: number;
  item_count: number;
  fulfilled: boolean;
  receipt_locked: boolean;
  is_overdue: boolean;
  created_at: string;
  created_by_name?: string | null;
};

export type QuotationListResponse = {
  items: QuotationListItem[];
  total: number;
  page: number;
  limit: number;
};

export type QuotationCountResponse = {
  count: number;
  by_status: Record<string, number>;
  overdue: number;
};

export type QuotationItemInput = {
  id?: number;
  product_item_id?: number | null;
  amount: number;
  price_per_unit: number;
  discount: number;
};

export type QuotationItemDetail = QuotationItemInput & {
  id: number;
  vat_type: string;
  vat_rate: number;
  total_price: number;
  sort_order: number;
};

export type QuotationFileDetail = {
  id: number;
  system_file_id: number;
  sort_order: number;
  file_name?: string;
};

export type QuotationLatestReject = {
  note: string;
  status: QuotationStatus;
  next_status: QuotationStatus;
  created_at: string;
  created_by_name?: string | null;
};

export type QuotationDetail = {
  id: number;
  sku?: string;
  status: QuotationStatus;
  parent_id?: number | null;
  member_user_id?: number | null;
  member_setting_credit_id?: number | null;
  member_name?: string | null;
  member_tel?: string | null;
  member_email?: string | null;
  issue_date?: string | null;
  valid_until?: string | null;
  reserve_stock: boolean;
  notes?: string | null;
  accept_mode?: QuotationAcceptMode | null;
  accepted_at?: string | null;
  credit_date?: string | null;
  vat_type: string;
  vat_rate: number;
  subtotal_ex_vat: number;
  discount_total: number;
  vat_amount: number;
  grand_total: number;
  fulfilled: boolean;
  receipt_locked: boolean;
  is_overdue: boolean;
  items: QuotationItemDetail[];
  files: QuotationFileDetail[];
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
  latest_reject?: QuotationLatestReject | null;
};

export type QuotationCreateBody = {
  status: QuotationStatus;
  parent_id?: number | null;
  member_user_id?: number | null;
  member_setting_credit_id?: number | null;
  member_name?: string | null;
  member_tel?: string | null;
  member_email?: string | null;
  issue_date?: string | null;
  valid_until?: string | null;
  reserve_stock?: boolean;
  notes?: string | null;
  items: QuotationItemInput[];
  file_ids?: number[];
};

export type QuotationUpdateBody = Partial<QuotationCreateBody>;

export type QuotationFilterItem = { id: number; name: string };

export type QuotationFiltersResponse = {
  items: QuotationFilterItem[];
  meta: { total: number; page: number; limit: number };
};

export type QuotationPickingResponse = {
  order_list_id?: number;
  warnings?: string[];
  partial?: boolean;
  price_changed?: boolean;
  out_of_stock_count?: number;
};

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  overdue?: boolean;
  date_from?: string;
  date_to?: string;
  created_by?: string;
  signal?: AbortSignal;
};

function listQuery(params: ListParams): string {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.overdue) q.set("overdue", "true");
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.created_by) q.set("created_by", params.created_by);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchQuotationList(
  _locale: string,
  params: ListParams = {}
): Promise<QuotationListResponse> {
  const res = await authFetch(`${PROXY_BASE}${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<QuotationListResponse>;
}

export async function fetchQuotationCount(
  _locale: string,
  params: Omit<ListParams, "page" | "limit"> = {}
): Promise<QuotationCountResponse> {
  const res = await authFetch(`${PROXY_BASE}/count${listQuery(params)}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<QuotationCountResponse>;
}

export async function fetchQuotationFilters(
  _locale: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    id?: number;
    signal?: AbortSignal;
  } = {}
): Promise<QuotationFiltersResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search) q.set("search", params.search);
  if (params.id) q.set("id", String(params.id));
  const res = await authFetch(`${PROXY_BASE}/filters?${q}`, {
    signal: params.signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<QuotationFiltersResponse>;
}

export async function fetchQuotationDetail(
  _locale: string,
  id: number
): Promise<QuotationDetail> {
  const res = await authFetch(`${PROXY_BASE}/${id}`);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<QuotationDetail>;
}

export async function createQuotation(
  locale: string,
  body: QuotationCreateBody
): Promise<{ id: number }> {
  const res = await authFetch(PROXY_BASE, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{ id: number }>;
}

export async function patchQuotation(
  locale: string,
  id: number,
  body: QuotationUpdateBody
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchQuotationStatus(
  locale: string,
  id: number,
  status: QuotationStatus
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}/status`, {
    method: "PATCH",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function postQuotationAction(
  locale: string,
  id: number,
  action: string,
  body: Record<string, unknown> = {}
): Promise<Response> {
  const res = await authFetch(`${PROXY_BASE}/${id}/${action}`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res;
}

export async function duplicateQuotation(
  locale: string,
  id: number,
  itemIds?: number[]
): Promise<{ id: number }> {
  const res = await postQuotationAction(locale, id, "duplicate", {
    item_ids: itemIds ?? [],
  });
  return res.json() as Promise<{ id: number }>;
}

export async function pickingQuotation(
  locale: string,
  id: number,
  onlyInStock: boolean
): Promise<QuotationPickingResponse> {
  const res = await authFetch(`${PROXY_BASE}/${id}/picking`, {
    method: "POST",
    headers: bffJsonHeaders(locale),
    body: JSON.stringify({ only_in_stock: onlyInStock }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<QuotationPickingResponse>;
}

export async function deleteQuotation(
  _locale: string,
  id: number
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseError(res);
}
