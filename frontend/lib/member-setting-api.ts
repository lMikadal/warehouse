import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  bffJsonHeaders,
  createBffCrudClient,
  parseBffError,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";
import type { MemberSettingSegment } from "@/lib/bff-member-setting-handlers";

export type MemberSettingItem = {
  id: number;
  sku?: string | null;
  name: string;
  is_active: boolean;
  updated_at: string;
  names?: { th?: string; en?: string };
};

export type MemberRelationItem = {
  id: number;
  credit_id: number;
  group_id: number;
  business_id: number;
  is_active: boolean;
  credit_name?: string;
  group_name?: string;
  updated_at: string;
};

export { BffApiError as MemberSettingApiError };

function proxyBase(segment: MemberSettingSegment): string {
  return `/api/v1/auth/proxy/member/settings/${segment}`;
}

function client(segment: MemberSettingSegment) {
  return createBffCrudClient(proxyBase(segment));
}

export async function fetchMemberSettingList(
  locale: string,
  segment: MemberSettingSegment,
  params: BffStandardListParams
) {
  return client(segment).list<MemberSettingItem>(locale, params);
}

export async function fetchMemberSettingById(
  locale: string,
  segment: MemberSettingSegment,
  id: number
) {
  return client(segment).getById<MemberSettingItem>(locale, id);
}

export async function createMemberSetting(
  locale: string,
  segment: MemberSettingSegment,
  body: Record<string, unknown>
) {
  return client(segment).create(locale, body);
}

export async function patchMemberSetting(
  locale: string,
  segment: MemberSettingSegment,
  id: number,
  body: Record<string, unknown>
) {
  return client(segment).patchVoid(locale, id, body);
}

export async function deleteMemberSetting(
  locale: string,
  segment: MemberSettingSegment,
  id: number
) {
  return client(segment).delete(locale, id);
}

export async function fetchBusinessRelations(
  locale: string,
  businessId: number
): Promise<MemberRelationItem[]> {
  const res = await authFetch(
    `${proxyBase("businesses")}/${businessId}/relations`,
    { headers: bffJsonHeaders(locale) }
  );
  if (!res.ok) throw await parseBffError(res);
  const data = (await res.json()) as { items: MemberRelationItem[] };
  return data.items ?? [];
}

export async function patchMemberRelation(
  locale: string,
  relationId: number,
  body: { is_active: boolean }
) {
  const res = await authFetch(
    `/api/v1/auth/proxy/member/settings/relations/${relationId}`,
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

export async function deleteMemberRelation(
  locale: string,
  relationId: number
) {
  const res = await authFetch(
    `/api/v1/auth/proxy/member/settings/relations/${relationId}`,
    {
      method: "DELETE",
      headers: bffJsonHeaders(locale),
    }
  );
  if (!res.ok) throw await parseBffError(res);
}
