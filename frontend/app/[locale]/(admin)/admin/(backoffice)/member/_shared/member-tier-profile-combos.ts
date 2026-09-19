import { fetchTierSettingRelationFilters } from "@/lib/member-tier-api";

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

/** ponytail: paginated tier filters API; cap pages to avoid unbounded load on huge catalogs. */
const MAX_FILTER_PAGES = 3;
const FILTER_PAGE_SIZE = 100;

export async function loadProfileComboOptions(
  locale: string
): Promise<ProfileComboOption[]> {
  const out: ProfileComboOption[] = [];
  let page = 1;
  while (page <= MAX_FILTER_PAGES) {
    const { items, meta } = await fetchTierSettingRelationFilters(locale, {
      page,
      limit: FILTER_PAGE_SIZE,
    });
    for (const row of items) {
      out.push({
        value: String(row.id),
        label: row.name,
        businessTitle: row.business_title,
        creditName: row.credit_name?.trim() ?? "",
      });
    }
    if (page * FILTER_PAGE_SIZE >= meta.total) break;
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
