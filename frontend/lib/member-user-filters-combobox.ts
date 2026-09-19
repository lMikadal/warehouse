import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchMemberUserBusinessRelations,
  fetchMemberUserFilters,
  fetchMemberUserSettingRelationById,
  memberFilterItemsToOptions,
  type MemberUserFilterFacet,
} from "@/lib/member-user-filters-api";
import type { GeoResource } from "@/lib/system-geo-api";

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

export type MemberUserGeoComboboxListParams = {
  search: string;
  signal?: AbortSignal;
  systemCountryId?: number;
  systemProvinceId?: number;
  systemDistrictId?: number;
};

export function geoResourceToMemberFacet(
  resource: GeoResource
): MemberUserFilterFacet {
  if (resource === "provinces") return "provinces";
  if (resource === "districts") return "districts";
  return "sub_districts";
}

export async function loadMemberUserGeoComboboxOptions(
  resource: GeoResource,
  locale: string,
  params: MemberUserGeoComboboxListParams
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const facet = geoResourceToMemberFacet(resource);
  const { items } = await fetchMemberUserFilters(locale, facet, {
    search: params.search,
    signal: params.signal,
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    system_country_id: params.systemCountryId,
    system_province_id: params.systemProvinceId,
    system_district_id: params.systemDistrictId,
  });
  if (params.signal?.aborted) return [];
  return memberFilterItemsToOptions(items);
}

export async function resolveMemberUserGeoComboboxLabel(
  resource: GeoResource,
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const facet = geoResourceToMemberFacet(resource);
    const { items } = await fetchMemberUserFilters(locale, facet, { id });
    return items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}
