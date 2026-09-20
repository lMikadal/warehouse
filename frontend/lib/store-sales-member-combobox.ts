import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchMemberUser,
  fetchMemberUsers,
  type MemberUserDetail,
  type MemberUserListItem,
} from "@/lib/member-user-api";

export type StoreSalesMemberFormSnapshot = {
  memberName: string;
  memberTel: string;
  memberEmail: string;
  memberAddressDisplay: string;
  memberTaxNumber: string;
};

function memberListLabel(row: MemberUserListItem): string {
  const sku = row.sku?.trim();
  const name = row.name?.trim() || `#${row.id}`;
  return sku ? `${sku} — ${name}` : name;
}

export function formatStoreSalesMemberAddress(
  d: Pick<
    MemberUserDetail,
    | "address"
    | "website_sub_district_name"
    | "website_district_name"
    | "website_province_name"
    | "postcode"
  >
): string {
  const parts = [
    d.address?.trim(),
    d.website_sub_district_name?.trim(),
    d.website_district_name?.trim(),
    d.website_province_name?.trim(),
    d.postcode?.trim(),
  ].filter(Boolean);
  return parts.join(" ");
}

export function storeSalesMemberSnapshotFromDetail(
  d: MemberUserDetail
): StoreSalesMemberFormSnapshot {
  return {
    memberName: d.name?.trim() ?? "",
    memberTel: d.tel?.trim() ?? "",
    memberEmail: d.email?.trim() ?? "",
    memberAddressDisplay: formatStoreSalesMemberAddress(d),
    memberTaxNumber: d.tax_number?.trim() ?? "",
  };
}

export async function loadStoreSalesMemberComboboxOptions(
  locale: string,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchMemberUsers(locale, {
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: params.search.trim() || undefined,
  });
  if (params.signal?.aborted) return [];
  return res.rows.map((row) => ({
    value: String(row.id),
    label: memberListLabel(row),
  }));
}

export async function resolveStoreSalesMemberLabel(
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const d = await fetchMemberUser(locale, id);
    return memberListLabel({
      id: d.id,
      sku: d.sku,
      name: d.name,
      is_active: d.is_active,
      created_at: d.created_at ?? "",
      updated_at: d.updated_at,
    });
  } catch {
    return null;
  }
}

export async function fetchStoreSalesMemberSnapshot(
  locale: string,
  memberId: number
): Promise<StoreSalesMemberFormSnapshot> {
  const d = await fetchMemberUser(locale, memberId);
  return storeSalesMemberSnapshotFromDetail(d);
}
