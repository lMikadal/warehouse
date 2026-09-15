import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import {
  fetchSystemGeoById,
  fetchSystemGeoFilters,
  fetchSystemGeoList,
  type GeoFilterFacet,
  type GeoResource,
  type SystemGeoListParams,
} from "@/lib/system-geo-api";

export type GeoComboboxListParams = Pick<
  SystemGeoListParams,
  "systemCountryId" | "systemProvinceId" | "systemDistrictId" | "isActive"
>;

export async function loadGeoComboboxOptions(
  resource: GeoResource,
  locale: string,
  params: GeoComboboxListParams & { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const { search, signal, ...listParams } = params;
  const { rows } = await fetchSystemGeoList(resource, locale, {
    ...listParams,
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: search.trim() || undefined,
    isActive: listParams.isActive ?? true,
  });
  if (signal?.aborted) return [];
  return rows.map((r) => ({ value: String(r.id), label: r.name }));
}

export async function loadGeoFilterComboboxOptions(
  pageResource: GeoResource,
  facet: GeoFilterFacet,
  locale: string,
  params: GeoComboboxListParams & { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const { search, signal, ...listParams } = params;
  const { items } = await fetchSystemGeoFilters(pageResource, locale, {
    facet,
    page: 1,
    limit: REMOTE_COMBOBOX_LIMIT,
    search: search.trim() || undefined,
    systemCountryId: listParams.systemCountryId,
    systemProvinceId: listParams.systemProvinceId,
    systemDistrictId: listParams.systemDistrictId,
  });
  if (signal?.aborted) return [];
  return items.map((r) => ({ value: String(r.id), label: r.name }));
}

export async function resolveGeoFilterComboboxLabel(
  pageResource: GeoResource,
  facet: GeoFilterFacet,
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const { items } = await fetchSystemGeoFilters(pageResource, locale, {
      facet,
      id,
    });
    return items[0]?.name?.trim() || null;
  } catch {
    return null;
  }
}

export async function resolveGeoComboboxLabel(
  resource: GeoResource,
  locale: string,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const item = await fetchSystemGeoById(resource, id, locale);
    return item.name?.trim() || null;
  } catch {
    return null;
  }
}

export function geoResourceForParentKey(
  createParentKey: "system_country_id" | "system_province_id" | "system_district_id"
): GeoResource {
  if (createParentKey === "system_country_id") return "countries";
  if (createParentKey === "system_province_id") return "provinces";
  return "districts";
}

export function geoResourceToFilterFacet(
  resource: GeoResource
): GeoFilterFacet | null {
  if (resource === "countries") return "countries";
  if (resource === "provinces") return "provinces";
  if (resource === "districts") return "districts";
  return null;
}
