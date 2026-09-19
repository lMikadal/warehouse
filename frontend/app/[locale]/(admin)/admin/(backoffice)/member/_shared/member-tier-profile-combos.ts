import {
  fetchBusinessRelations,
  fetchMemberSettingList,
  type MemberRelationItem,
} from "@/lib/member-setting-api";

export type ProfileComboOption = {
  value: string;
  label: string;
  businessTitle: string;
  creditName: string;
};

export type ProfileDisplay = {
  businessTitle: string;
  creditName: string;
};

/** ponytail: loads up to 300 active businesses × relations; upgrade path = dedicated relations list API. */
const MAX_BUSINESS_PAGES = 3;
const BUSINESS_PAGE_SIZE = 100;

function profileBusinessTitle(businessName: string, rel: MemberRelationItem): string {
  const business = businessName.trim();
  const group = rel.group_name?.trim() ?? "";
  if (group && group !== business) {
    return `${business}${group}`;
  }
  return business || "—";
}

function comboLabel(
  businessName: string,
  rel: MemberRelationItem
): string {
  const parts = [
    businessName.trim(),
    rel.credit_name?.trim() ?? "",
    rel.group_name?.trim() ?? "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : `#${rel.id}`;
}

export async function loadProfileComboOptions(
  locale: string
): Promise<ProfileComboOption[]> {
  const out: ProfileComboOption[] = [];
  let page = 1;
  while (page <= MAX_BUSINESS_PAGES) {
    const { items, meta } = await fetchMemberSettingList(locale, "businesses", {
      page,
      limit: BUSINESS_PAGE_SIZE,
      isActive: true,
    });
    for (const biz of items) {
      const rels = await fetchBusinessRelations(locale, biz.id);
      for (const rel of rels) {
        if (!rel.is_active) continue;
        out.push({
          value: String(rel.id),
          label: comboLabel(biz.name, rel),
          businessTitle: profileBusinessTitle(biz.name, rel),
          creditName: rel.credit_name?.trim() ?? "",
        });
      }
    }
    if (page * BUSINESS_PAGE_SIZE >= meta.total) break;
    page += 1;
  }
  return out;
}

export function filterProfileOptions(
  options: ProfileComboOption[],
  search: string
): ProfileComboOption[] {
  const q = search.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

export function profileLabelById(
  options: ProfileComboOption[],
  relationId: number
): string {
  return options.find((o) => o.value === String(relationId))?.label ?? "—";
}

export function profileDisplayById(
  options: ProfileComboOption[],
  relationId: number
): ProfileDisplay | null {
  const row = options.find((o) => o.value === String(relationId));
  if (!row) return null;
  return {
    businessTitle: row.businessTitle,
    creditName: row.creditName,
  };
}
