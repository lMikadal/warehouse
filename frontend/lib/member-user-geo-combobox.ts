import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import type { GeoResource } from "@/lib/system-geo-api";
import {
  fetchMemberUserFilters,
  memberFilterItemsToOptions,
  type MemberUserFilterFacet,
} from "@/lib/member-user-filters-api";

export type MemberUserGeoComboboxListParams = {
  search: string;
  signal?: AbortSignal;
  systemCountryId?: number;
  systemProvinceId?: number;
  systemDistrictId?: number;
};

function geoResourceToFacet(resource: GeoResource): MemberUserFilterFacet {
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
  const facet = geoResourceToFacet(resource);
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
    const facet = geoResourceToFacet(resource);
    const { items } = await fetchMemberUserFilters(locale, facet, { id });
    return items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}
