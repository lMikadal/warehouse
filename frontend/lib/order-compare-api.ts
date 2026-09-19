import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  parseBffError,
  type BffListMeta,
} from "@/lib/bff-crud-client";

const PROXY_BASE = "/api/v1/auth/proxy/order/compares";

export class OrderCompareApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<OrderCompareApiError> {
  const e = await parseBffError(res);
  return new OrderCompareApiError(e.message, e.status, e.code);
}

export type OrderCompareTreeNode = {
  id: number;
  name: string;
  system_file_id?: number | null;
  category_count?: number;
  is_defined: boolean;
  children: OrderCompareTreeNode[];
};

export type OrderCompareRuleLine = {
  member_setting_relation_id: number;
  business_name: string;
  group_name: string;
  credit_name: string;
  discount: number;
  discount_type: string;
  rule_id?: number;
};

export type OrderCompareExportRow = {
  id: number;
  brand_id: number;
  brand_name: string;
  category_id: number | null;
  category_name: string;
  member_setting_relation_id: number;
  discount: number;
  discount_type: string;
  updated_at: string;
};

export async function fetchOrderCompareTree(
  locale: string,
  params: { page: number; limit: number; search?: string }
): Promise<{ items: OrderCompareTreeNode[]; meta: BffListMeta }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const search = params.search?.trim();
  if (search) qs.set("search", search);
  const res = await authFetch(`${PROXY_BASE}/tree?${qs}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { items: OrderCompareTreeNode[]; meta: BffListMeta };
}

export async function fetchOrderCompareRules(
  locale: string,
  brandId: number,
  categoryId?: number | null
): Promise<OrderCompareRuleLine[]> {
  const qs = new URLSearchParams({ brand_id: String(brandId) });
  if (categoryId != null && categoryId > 0) {
    qs.set("category_id", String(categoryId));
  }
  const res = await authFetch(`${PROXY_BASE}/rules?${qs}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { items: OrderCompareRuleLine[] };
  return body.items ?? [];
}

export type RuleWritePayload = {
  member_setting_relation_id: number;
  discount: number;
  discount_type?: string;
};

export async function putOrderCompareRules(
  locale: string,
  body: {
    brand_id: number;
    category_id?: number | null;
    rules: RuleWritePayload[];
  }
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/rules`, {
    method: "PUT",
    headers: { ...bffJsonHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify({
      brand_id: body.brand_id,
      category_id: body.category_id ?? null,
      rules: body.rules.map((r) => ({
        member_setting_relation_id: r.member_setting_relation_id,
        discount: r.discount,
        discount_type: r.discount_type ?? "percent",
      })),
    }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function exportOrderCompareRules(
  locale: string
): Promise<OrderCompareExportRow[]> {
  const res = await authFetch(`${PROXY_BASE}/export`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { items: OrderCompareExportRow[] };
  return body.items ?? [];
}

export async function importOrderCompareRules(
  locale: string,
  items: Array<{
    brand_id: number;
    category_id?: number | null;
    member_setting_relation_id: number;
    discount: number;
    discount_type?: string;
  }>
): Promise<void> {
  const res = await authFetch(`${PROXY_BASE}/import`, {
    method: "POST",
    headers: { ...bffJsonHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw await parseError(res);
}

export { BffApiError };
