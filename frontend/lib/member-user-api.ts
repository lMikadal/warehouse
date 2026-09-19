import { authFetch } from "@/lib/auth-client";
import {
  BffApiError,
  createBffCrudClient,
  parseBffError,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

const BFF_BASE = "/api/v1/auth/proxy/member/users";
const client = createBffCrudClient(BFF_BASE);

export { BffApiError as MemberUserApiError };

export type MemberAddressInput = {
  type: "tax" | "doc" | "financial";
  member_type?: "person" | "company";
  setting_prefix_id?: number | null;
  name?: string | null;
  store_name?: string | null;
  tax_number?: string | null;
  branch?: "headquarter" | "branch" | null;
  branch_name?: string | null;
  address?: string | null;
  website_province_id?: number | null;
  website_district_id?: number | null;
  website_sub_district_id?: number | null;
  setting_prefix_name?: string | null;
  website_province_name?: string | null;
  website_district_name?: string | null;
  website_sub_district_name?: string | null;
  postcode?: string | null;
  tel?: string | null;
  email?: string | null;
  credit_limit?: number | null;
  credit_date?: number | null;
  relationship?: string | null;
  is_same_information?: boolean;
};

export type MemberUserListItem = {
  id: number;
  sku?: string | null;
  name: string;
  tel?: string | null;
  business_label?: string;
  member_tier_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MemberUserStats = {
  total_customers: number;
  active_members: number;
  new_this_month: number;
  sales_this_month: number;
};

export type MemberUserFileRow = {
  id: number;
  system_file_id: number;
  sort_order: number;
  updated_at: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  file_created_at: string;
  url: string;
  uploaded_by_username?: string | null;
};

export type MemberUserDiscountRow = {
  id: number;
  member_credit_id?: number | null;
  product_item_id: number;
  minimum_qty: number;
  discount: number;
  discount_type: string;
  date_start?: string | null;
  date_end?: string | null;
  is_active: boolean;
};

export type MemberUserHistoryRow = {
  id: number;
  title?: string;
  created_at?: string;
};

export type MemberUserDetail = {
  id: number;
  sku?: string | null;
  member_tier_id?: number | null;
  type: string;
  setting_prefix_id?: number | null;
  name: string;
  store_name?: string | null;
  tax_number?: string | null;
  branch?: string | null;
  branch_name?: string | null;
  tel?: string | null;
  email?: string | null;
  address?: string | null;
  website_province_id?: number | null;
  website_district_id?: number | null;
  website_sub_district_id?: number | null;
  setting_prefix_name?: string | null;
  website_province_name?: string | null;
  website_district_name?: string | null;
  website_sub_district_name?: string | null;
  postcode?: string | null;
  system_file_id?: number | null;
  note?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at: string;
  addresses: MemberAddressInput[];
  setting_relation_ids: number[];
  owner_admin_user_ids: number[];
  files: MemberUserFileRow[];
  discounts: MemberUserDiscountRow[];
  histories: MemberUserHistoryRow[];
};

export type MemberUserListParams = BffStandardListParams & {
  business_id?: number;
  member_tier_id?: number;
  created_from?: string;
  created_to?: string;
};

export type MemberUserCreateBody = {
  sku?: string | null;
  member_tier_id?: number | null;
  type?: string;
  setting_prefix_id?: number | null;
  name: string;
  store_name?: string | null;
  tax_number?: string | null;
  branch?: string | null;
  branch_name?: string | null;
  tel?: string | null;
  email?: string | null;
  address?: string | null;
  website_province_id?: number | null;
  website_district_id?: number | null;
  website_sub_district_id?: number | null;
  setting_prefix_name?: string | null;
  website_province_name?: string | null;
  website_district_name?: string | null;
  website_sub_district_name?: string | null;
  postcode?: string | null;
  system_file_id?: number | null;
  note?: string | null;
  is_active?: boolean;
  setting_relation_ids?: number[];
  owner_admin_user_ids?: number[];
  addresses?: MemberAddressInput[];
};

export type MemberUserPatchBody = Partial<MemberUserCreateBody>;

export type MemberUserDiscountInput = {
  member_credit_id?: number | null;
  product_item_id: number;
  minimum_qty?: number;
  discount: number;
  discount_type?: string;
  date_start?: string | null;
  date_end?: string | null;
  is_active?: boolean;
};

export async function fetchMemberUserStats(
  locale: string
): Promise<MemberUserStats> {
  const res = await authFetch(`${BFF_BASE}/stats`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) {
    throw await parseBffError(res);
  }
  return (await res.json()) as MemberUserStats;
}

export async function fetchMemberUsers(
  locale: string,
  params: MemberUserListParams
) {
  const { items, meta } = await client.list<MemberUserListItem>(
    locale,
    params,
    (qs) => {
      if (params.business_id != null) {
        qs.set("business_id", String(params.business_id));
      }
      if (params.member_tier_id != null) {
        qs.set("member_tier_id", String(params.member_tier_id));
      }
      const from = params.created_from?.trim();
      const to = params.created_to?.trim();
      if (from) qs.set("created_from", from);
      if (to) qs.set("created_to", to);
    }
  );
  return { rows: items, meta };
}

export async function fetchMemberUser(
  locale: string,
  id: number
): Promise<MemberUserDetail> {
  return client.getById<MemberUserDetail>(locale, id);
}

export async function createMemberUser(
  locale: string,
  body: MemberUserCreateBody
): Promise<{ id: number }> {
  return client.create(locale, body);
}

export async function patchMemberUser(
  locale: string,
  id: number,
  body: MemberUserPatchBody
): Promise<void> {
  return client.patchVoid(locale, id, body);
}

export async function deleteMemberUser(
  locale: string,
  id: number
): Promise<void> {
  return client.delete(locale, id);
}

export async function createMemberUserFile(
  locale: string,
  userId: number,
  systemFileId: number
): Promise<{ id: number }> {
  const res = await authFetch(`${BFF_BASE}/${userId}/files`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify({ system_file_id: systemFileId }),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as { id: number };
}

export async function reorderMemberUserFiles(
  locale: string,
  userId: number,
  dragId: number,
  targetId: number
): Promise<void> {
  const res = await authFetch(`${BFF_BASE}/${userId}/files/reorder`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify({ drag_id: dragId, target_id: targetId }),
  });
  if (!res.ok) throw await parseBffError(res);
}

export async function deleteMemberUserFile(
  locale: string,
  userId: number,
  fileId: number
): Promise<void> {
  const res = await authFetch(`${BFF_BASE}/${userId}/files/${fileId}`, {
    method: "DELETE",
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseBffError(res);
}

export async function createMemberUserDiscount(
  locale: string,
  userId: number,
  body: MemberUserDiscountInput
): Promise<{ id: number }> {
  const res = await authFetch(`${BFF_BASE}/${userId}/discounts`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as { id: number };
}

export async function patchMemberUserDiscount(
  locale: string,
  userId: number,
  discountId: number,
  body: MemberUserDiscountInput
): Promise<void> {
  const res = await authFetch(
    `${BFF_BASE}/${userId}/discounts/${discountId}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Language": locale,
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw await parseBffError(res);
}

export async function deleteMemberUserDiscount(
  locale: string,
  userId: number,
  discountId: number
): Promise<void> {
  const res = await authFetch(
    `${BFF_BASE}/${userId}/discounts/${discountId}`,
    {
      method: "DELETE",
      headers: { Accept: "application/json", "Accept-Language": locale },
    }
  );
  if (!res.ok) throw await parseBffError(res);
}

export async function createMemberUserHistory(
  locale: string,
  userId: number,
  names: { th: string; en: string }
): Promise<{ id: number }> {
  const res = await authFetch(`${BFF_BASE}/${userId}/histories`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify({ names }),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as { id: number };
}
