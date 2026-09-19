import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  createBffCrudClient,
  parseBffError,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

const PROXY_BASE = "/api/v1/auth/proxy/member/tiers";

const client = createBffCrudClient(PROXY_BASE);

export type TierScopeType =
  | "all"
  | "brand"
  | "category"
  | "except_brand"
  | "except_category";

export type MemberTierListItem = {
  id: number;
  parent_id: number | null;
  tree_path: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  discount: number;
  discount_type: string;
  member_count: number;
  relation_count: number;
  system_file_id: number | null;
  updated_at: string;
};

export type MemberTierStats = {
  total_members: number;
  total_sales_ytd: number;
  updated_at: string;
};

export type MemberTierRelation = {
  id: number;
  member_setting_relation_id: number;
  purchase_start: number;
  purchase_end: number;
  discount: number;
  discount_type: string;
  type: TierScopeType;
  is_promotion: boolean;
  attribute_ids?: number[];
  profile_business_title?: string;
  profile_credit_name?: string;
  updated_at: string;
};

export type TierSettingRelationFilterItem = {
  id: number;
  name: string;
  business_title: string;
  credit_name: string;
  group_name: string;
};

export type MemberTierDetail = {
  id: number;
  parent_id: number | null;
  tree_path: string;
  sort_order: number;
  system_file_id: number | null;
  is_default: boolean;
  is_active: boolean;
  purchase_start: number;
  purchase_end: number;
  discount: number;
  discount_type: string;
  type: TierScopeType;
  is_promotion: boolean;
  name: string;
  names?: { th?: string; en?: string };
  attribute_ids?: number[];
  relations: MemberTierRelation[];
  updated_at: string;
};

export type TierRelationWriteBody = {
  member_setting_relation_id: number;
  purchase_start: number;
  purchase_end: number;
  discount: number;
  discount_type: string;
  type: TierScopeType;
  is_promotion: boolean;
  attribute_ids: number[];
};

export { BffApiError as MemberTierApiError };

export async function fetchTierList(
  locale: string,
  params: BffStandardListParams
) {
  return client.list<MemberTierListItem>(locale, params);
}

export async function fetchTierStats(locale: string) {
  return client.getJson<MemberTierStats>(locale, "/stats");
}

export type TierSettingRelationFiltersParams = {
  page?: number;
  limit?: number;
  search?: string;
  id?: number;
};

export async function fetchTierSettingRelationFilters(
  locale: string,
  params: TierSettingRelationFiltersParams = {}
) {
  const q = new URLSearchParams();
  q.set("facet", "setting_relations");
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 100));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.id != null && params.id > 0) q.set("id", String(params.id));
  const res = await authFetch(`${PROXY_BASE}/filters?${q}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as {
    items: TierSettingRelationFilterItem[];
    meta: { total: number; page: number; limit: number };
  };
}

export async function fetchTierById(locale: string, id: number) {
  return client.getById<MemberTierDetail>(locale, id);
}

export async function createTier(
  locale: string,
  body: Record<string, unknown>
) {
  return client.create(locale, body);
}

export async function patchTier(
  locale: string,
  id: number,
  body: Record<string, unknown>
) {
  return client.patchVoid(locale, id, body);
}

export async function deleteTier(locale: string, id: number) {
  return client.delete(locale, id);
}

export async function createTierRelation(
  locale: string,
  tierId: number,
  body: TierRelationWriteBody
) {
  const res = await authFetch(`${PROXY_BASE}/${tierId}/relations`, {
    method: "POST",
    headers: {
      ...bffJsonHeaders(locale),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as { id: number };
}

export async function patchTierRelation(
  locale: string,
  tierId: number,
  relationId: number,
  body: Omit<TierRelationWriteBody, "member_setting_relation_id">
) {
  const res = await authFetch(
    `${PROXY_BASE}/${tierId}/relations/${relationId}`,
    {
      method: "PATCH",
      headers: {
        ...bffJsonHeaders(locale),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw await parseBffError(res);
}

export async function deleteTierRelation(
  locale: string,
  tierId: number,
  relationId: number
) {
  const res = await authFetch(
    `${PROXY_BASE}/${tierId}/relations/${relationId}`,
    {
      method: "DELETE",
      headers: bffJsonHeaders(locale),
    }
  );
  if (!res.ok) throw await parseBffError(res);
}
