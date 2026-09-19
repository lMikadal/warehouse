import {
  fetchMemberUserBusinessRelations,
  fetchMemberUserFilters,
  fetchMemberUserSettingRelationById,
  memberFilterItemsToOptions,
} from "@/lib/member-user-filters-api";
import type { RemoteComboboxOption } from "@/hooks/use-remote-combobox-options";

export { fetchMemberUserBusinessRelations, fetchMemberUserSettingRelationById };

/** ponytail: paginated user filters API; cap pages to avoid unbounded load. */
const MAX_FILTER_PAGES = 3;
const FILTER_PAGE_SIZE = 100;

export type ProfileComboOption = {
  value: string;
  label: string;
};

export async function loadMemberProfileComboOptions(
  locale: string
): Promise<ProfileComboOption[]> {
  const out: ProfileComboOption[] = [];
  let page = 1;
  while (page <= MAX_FILTER_PAGES) {
    const { items, meta } = await fetchMemberUserFilters(
      locale,
      "setting_relations",
      { page, limit: FILTER_PAGE_SIZE }
    );
    for (const row of items) {
      out.push({ value: String(row.id), label: row.name });
    }
    if (!meta || page * FILTER_PAGE_SIZE >= meta.total) break;
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

export async function loadMemberUserBusinessFilterOptions(
  locale: string,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(locale, "businesses", {
    page,
    search,
    id,
  });
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}

export async function loadMemberUserPrefixOptions(
  locale: string,
  memberType: "person" | "company",
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(locale, "prefixes", {
    page,
    search,
    id,
    member_type: memberType,
  });
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}

export async function loadMemberUserTierOptions(
  locale: string,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(locale, "tiers", {
    page,
    search,
    id,
  });
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}

export async function loadMemberUserAdminOptions(
  locale: string,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(locale, "admin_users", {
    page,
    search,
    id,
  });
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}

export async function loadMemberUserProductItemOptions(
  locale: string,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(
    locale,
    "product_items",
    { page, search, id }
  );
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}

export async function loadMemberUserProductBrandOptions(
  locale: string,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(
    locale,
    "product_brands",
    { page, search, id }
  );
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}

export async function loadMemberUserCreditOptions(
  locale: string,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchMemberUserFilters(
    locale,
    "member_credits",
    { page, search, id }
  );
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? (items?.length ?? 0),
  };
}
