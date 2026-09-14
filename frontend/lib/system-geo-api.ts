import { authFetch } from "@/lib/auth-client";

/** BFF under `/api/v1/auth/proxy/system/…` */
export type GeoResource =
  | "countries"
  | "provinces"
  | "districts"
  | "sub-districts";

function bffBase(resource: GeoResource): string {
  return `/api/v1/auth/proxy/system/${resource}`;
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

type ListResponse = {
  items: SystemGeoApiItem[];
  meta: { total: number; page: number; limit: number };
};

export type SystemGeoListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sort?: string | null;
  order?: "asc" | "desc" | null;
  systemCountryId?: number;
  systemProvinceId?: number;
  systemDistrictId?: number;
};

export class SystemGeoApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<SystemGeoApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new SystemGeoApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new SystemGeoApiError(res.statusText, res.status);
  }
}

function bffHeaders(locale: string): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Language": locale,
  };
}

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

function buildListQuery(params: SystemGeoListParams): URLSearchParams {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  const search = params.search?.trim();
  if (search) qs.set("search", search);
  if (params.isActive !== undefined) {
    qs.set("is_active", params.isActive ? "true" : "false");
  }
  if (params.systemCountryId) {
    qs.set("system_country_id", String(params.systemCountryId));
  }
  if (params.systemProvinceId) {
    qs.set("system_province_id", String(params.systemProvinceId));
  }
  if (params.systemDistrictId) {
    qs.set("system_district_id", String(params.systemDistrictId));
  }
  if (params.sort && params.order) {
    qs.set("sort", params.sort);
    qs.set("order", params.order);
  }
  return qs;
}

export async function fetchSystemGeoList(
  resource: GeoResource,
  locale: string,
  params: SystemGeoListParams
): Promise<{ rows: SystemGeoRow[]; meta: ListResponse["meta"] }> {
  const url = `${bffBase(resource)}?${buildListQuery(params)}`;
  const res = await authFetch(url, {
    headers: bffHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as ListResponse;
  return {
    rows: (body.items ?? []).map(mapApiGeoToRow),
    meta: body.meta ?? { total: 0, page: params.page, limit: params.limit },
  };
}

export async function fetchSystemGeoById(
  resource: GeoResource,
  id: number,
  locale: string
): Promise<SystemGeoApiItem> {
  const res = await authFetch(`${bffBase(resource)}/${id}`, {
    headers: bffHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as SystemGeoApiItem;
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
  const res = await authFetch(bffBase(resource), {
    method: "POST",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { id: number };
}

export async function patchSystemGeo(
  resource: GeoResource,
  id: number,
  body: SystemGeoPatchBody,
  locale: string
): Promise<void> {
  const res = await authFetch(`${bffBase(resource)}/${id}`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deleteSystemGeo(
  resource: GeoResource,
  id: number,
  locale: string
): Promise<void> {
  const res = await authFetch(`${bffBase(resource)}/${id}`, {
    method: "DELETE",
    headers: bffHeaders(locale),
  });
  if (!res.ok) throw await parseError(res);
}

export async function reorderSystemGeo(
  resource: GeoResource,
  dragId: number,
  targetId: number,
  locale: string
): Promise<void> {
  const res = await authFetch(`${bffBase(resource)}/reorder`, {
    method: "PATCH",
    headers: { ...bffHeaders(locale), "Content-Type": "application/json" },
    body: JSON.stringify({ drag_id: dragId, target_id: targetId }),
  });
  if (!res.ok) throw await parseError(res);
}
