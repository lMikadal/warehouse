import {
  BffApiError,
  createBffCrudClient,
  type AppendListQuery,
  type BffStandardListParams,
} from "@/lib/bff-crud-client";

/** BFF under `/api/v1/auth/proxy/system/…` */
export type GeoResource =
  | "countries"
  | "provinces"
  | "districts"
  | "sub-districts";

function bffBase(resource: GeoResource): string {
  return `/api/v1/auth/proxy/system/${resource}`;
}

function geoClient(resource: GeoResource) {
  return createBffCrudClient(bffBase(resource));
}

export type SystemGeoApiItem = {
  id: number;
  sku?: string | null;
  name: string;
  postcode?: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  system_country_id?: number;
  system_province_id?: number;
  system_district_id?: number;
  parent_label?: string;
  names?: { th?: string; en?: string };
};

export type SystemGeoRow = {
  id: number;
  sku: string;
  name: string;
  postcode: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  system_country_id?: number;
  system_province_id?: number;
  system_district_id?: number;
  parent_label: string;
};

export type SystemGeoListParams = BffStandardListParams & {
  systemCountryId?: number;
  systemProvinceId?: number;
  systemDistrictId?: number;
};

export { BffApiError as SystemGeoApiError };

export function mapApiGeoToRow(item: SystemGeoApiItem): SystemGeoRow {
  return {
    id: item.id,
    sku: item.sku?.trim() || "—",
    name: item.name,
    postcode: item.postcode?.trim() || "—",
    sort_order: item.sort_order,
    is_active: item.is_active,
    updated_at: item.updated_at,
    system_country_id: item.system_country_id,
    system_province_id: item.system_province_id,
    system_district_id: item.system_district_id,
    parent_label: item.parent_label?.trim() || "—",
  };
}

function geoListAppendQuery(params: SystemGeoListParams): AppendListQuery {
  return (qs) => {
    if (params.systemCountryId) {
      qs.set("system_country_id", String(params.systemCountryId));
    }
    if (params.systemProvinceId) {
      qs.set("system_province_id", String(params.systemProvinceId));
    }
    if (params.systemDistrictId) {
      qs.set("system_district_id", String(params.systemDistrictId));
    }
  };
}

export async function fetchSystemGeoList(
  resource: GeoResource,
  locale: string,
  params: SystemGeoListParams
): Promise<{ rows: SystemGeoRow[]; meta: { total: number; page: number; limit: number } }> {
  const { items, meta } = await geoClient(resource).list<SystemGeoApiItem>(
    locale,
    params,
    geoListAppendQuery(params)
  );
  return {
    rows: items.map(mapApiGeoToRow),
    meta,
  };
}

export async function fetchSystemGeoById(
  resource: GeoResource,
  id: number,
  locale: string
): Promise<SystemGeoApiItem> {
  return geoClient(resource).getById<SystemGeoApiItem>(locale, id);
}

export type SystemGeoCreateBody = {
  sku?: string;
  postcode?: string;
  is_active?: boolean;
  names: { th: string; en: string };
  system_country_id?: number;
  system_province_id?: number;
  system_district_id?: number;
};

export type SystemGeoPatchBody = {
  sku?: string;
  postcode?: string;
  is_active?: boolean;
  names?: { th: string; en: string };
  system_country_id?: number;
  system_province_id?: number;
  system_district_id?: number;
};

export async function createSystemGeo(
  resource: GeoResource,
  body: SystemGeoCreateBody,
  locale: string
): Promise<{ id: number }> {
  return geoClient(resource).create(locale, body);
}

export async function patchSystemGeo(
  resource: GeoResource,
  id: number,
  body: SystemGeoPatchBody,
  locale: string
): Promise<void> {
  return geoClient(resource).patchVoid(locale, id, body);
}

export async function deleteSystemGeo(
  resource: GeoResource,
  id: number,
  locale: string
): Promise<void> {
  return geoClient(resource).delete(locale, id);
}

export async function reorderSystemGeo(
  resource: GeoResource,
  dragId: number,
  targetId: number,
  locale: string
): Promise<void> {
  return geoClient(resource).reorder(locale, dragId, targetId);
}
