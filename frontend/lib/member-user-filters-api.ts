import { authFetch } from "@/lib/auth-client";
import type { BffListMeta } from "@/lib/bff-crud-client";
import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";

import type { MemberBusinessRelationRow, MemberSettingRelationFilterRow } from "@/lib/member-user-relations";

const PROXY = "/api/v1/auth/proxy/member/users/filters";

export type MemberUserFilterFacet =
  | "businesses"
  | "business_relations"
  | "setting_relations"
  | "tiers"
  | "prefixes"
  | "admin_users"
  | "product_items"
  | "member_credits";

type FilterItem = { id: number; name: string };

type FiltersResponse = {
  items: FilterItem[];
  meta?: BffListMeta;
};

type SettingRelationsFiltersResponse = {
  items: MemberSettingRelationFilterRow[];
  meta?: BffListMeta;
};

type BusinessRelationsFiltersResponse = {
  items: MemberBusinessRelationRow[];
};

export type MemberUserFiltersParams = {
  page?: number;
  limit?: number;
  search?: string;
  id?: number;
  member_type?: "person" | "company";
};

export async function fetchMemberUserFilters(
  locale: string,
  facet: MemberUserFilterFacet,
  params: MemberUserFiltersParams & { signal?: AbortSignal } = {}
): Promise<FiltersResponse> {
  const q = new URLSearchParams();
  q.set("facet", facet);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.id != null && params.id > 0) q.set("id", String(params.id));
  if (params.member_type) q.set("member_type", params.member_type);
  const res = await authFetch(`${PROXY}?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    signal: params.signal,
  });
  if (!res.ok) {
    throw new Error(`filters ${res.status}`);
  }
  return (await res.json()) as FiltersResponse;
}

export function memberFilterItemsToOptions(
  items: FilterItem[]
): RemoteComboboxOption[] {
  return items.map((row) => ({ value: String(row.id), label: row.name }));
}

export async function fetchMemberUserBusinessRelations(
  locale: string,
  businessId: number,
  signal?: AbortSignal
): Promise<MemberBusinessRelationRow[]> {
  const q = new URLSearchParams();
  q.set("facet", "business_relations");
  q.set("business_id", String(businessId));
  const res = await authFetch(`${PROXY}?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    signal,
  });
  if (!res.ok) {
    throw new Error(`filters business_relations ${res.status}`);
  }
  const data = (await res.json()) as BusinessRelationsFiltersResponse;
  return data.items ?? [];
}

export async function fetchMemberUserSettingRelationById(
  locale: string,
  id: number,
  signal?: AbortSignal
): Promise<MemberSettingRelationFilterRow | null> {
  const q = new URLSearchParams();
  q.set("facet", "setting_relations");
  q.set("id", String(id));
  q.set("page", "1");
  q.set("limit", "1");
  const res = await authFetch(`${PROXY}?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
    signal,
  });
  if (!res.ok) {
    throw new Error(`filters setting_relations ${res.status}`);
  }
  const data = (await res.json()) as SettingRelationsFiltersResponse;
  return data.items?.[0] ?? null;
}
