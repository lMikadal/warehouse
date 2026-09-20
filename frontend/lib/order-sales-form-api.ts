import { authFetch } from "@/lib/auth-client";
import { bffJsonHeaders, parseBffError } from "@/lib/bff-crud-client";
import {
  REMOTE_COMBOBOX_LIMIT,
  type RemoteComboboxOption,
} from "@/hooks/use-remote-combobox-options";
import type { MemberUserDetail } from "@/lib/member-user-api";
import type {
  ProductItemBrowseRow,
  ProductItemListParams,
} from "@/lib/product-list-api";

type ProductItemBrowseListResponse = {
  items: ProductItemBrowseRow[];
  meta: { total: number; page: number; limit: number };
};
import type { SettingVatItem } from "@/lib/setting-api";
import {
  filterItemsToComboboxOptions,
  type ProductFilterItem,
  type ProductFiltersParams,
} from "@/lib/product-filters-api";
import { memberFilterItemsToOptions } from "@/lib/member-user-filters-api";

export type OrderSalesFormResource = "store-sales" | "quotations";

function proxyBase(resource: OrderSalesFormResource) {
  return `/api/v1/auth/proxy/order/${resource}`;
}

type FiltersMeta = { total: number; page: number; limit: number };

type FiltersResponse = {
  items: { id: number; name: string; sku?: string }[];
  meta?: FiltersMeta;
};

export async function fetchOrderSalesFormFilters(
  locale: string,
  resource: OrderSalesFormResource,
  facet: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    id?: number;
    typeCar?: string;
    parentId?: number;
    isActive?: boolean;
  } = {},
  signal?: AbortSignal
): Promise<FiltersResponse> {
  const q = new URLSearchParams();
  q.set("facet", facet);
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? REMOTE_COMBOBOX_LIMIT));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.id != null && params.id > 0) q.set("id", String(params.id));
  if (params.typeCar) q.set("type_car", params.typeCar);
  if (params.parentId != null && params.parentId > 0) {
    q.set("parent_id", String(params.parentId));
  }
  if (params.isActive !== undefined) {
    q.set("is_active", params.isActive ? "true" : "false");
  }
  const res = await authFetch(`${proxyBase(resource)}/filters?${q}`, {
    headers: bffJsonHeaders(locale),
    signal,
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as FiltersResponse;
}

export async function fetchOrderSalesFormVat(
  locale: string,
  resource: OrderSalesFormResource
): Promise<SettingVatItem> {
  const res = await authFetch(`${proxyBase(resource)}/vat`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as SettingVatItem;
}

export async function fetchOrderSalesFormItems(
  locale: string,
  resource: OrderSalesFormResource,
  params: ProductItemListParams = {}
): Promise<ProductItemBrowseListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 10));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.isActive !== undefined) {
    q.set("is_active", params.isActive ? "true" : "false");
  }
  if (params.isNew) q.set("is_new", "true");
  if (params.productCategoryId != null) {
    q.set("product_category_id", String(params.productCategoryId));
  }
  if (params.productBrandId != null) {
    q.set("product_brand_id", String(params.productBrandId));
  }
  if (params.carBrandId != null) {
    q.set("car_brand_id", String(params.carBrandId));
  }
  if (params.productAttributeModelId != null) {
    q.set("product_attribute_model_id", String(params.productAttributeModelId));
  }
  if (params.carYear != null) q.set("car_year", String(params.carYear));
  if (params.oem?.trim()) q.set("oem", params.oem.trim());
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  if (params.ids?.length) {
    q.set("ids", [...new Set(params.ids)].slice(0, 100).join(","));
    q.set("limit", String(Math.min(params.ids.length, 100)));
  }
  const res = await authFetch(`${proxyBase(resource)}/items?${q}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as ProductItemBrowseListResponse;
}

export async function fetchOrderSalesFormItemsByIds(
  locale: string,
  resource: OrderSalesFormResource,
  ids: number[]
): Promise<ProductItemBrowseRow[]> {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  if (unique.length === 0) return [];
  const res = await fetchOrderSalesFormItems(locale, resource, {
    page: 1,
    ids: unique,
  });
  return res.items;
}

export async function fetchOrderSalesFormMember(
  locale: string,
  resource: OrderSalesFormResource,
  memberId: number
): Promise<MemberUserDetail> {
  const res = await authFetch(`${proxyBase(resource)}/members/${memberId}`, {
    headers: bffJsonHeaders(locale),
  });
  if (!res.ok) throw await parseBffError(res);
  return (await res.json()) as MemberUserDetail;
}

export async function loadOrderSalesCreditOptions(
  locale: string,
  resource: OrderSalesFormResource,
  search: string,
  page: number,
  id?: number
): Promise<{ options: RemoteComboboxOption[]; total: number }> {
  const { items, meta } = await fetchOrderSalesFormFilters(
    locale,
    resource,
    "member_credits",
    { page, search, id }
  );
  return {
    options: memberFilterItemsToOptions(items),
    total: meta?.total ?? items.length,
  };
}

export async function loadOrderSalesMemberComboboxOptions(
  locale: string,
  resource: OrderSalesFormResource,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const { items } = await fetchOrderSalesFormFilters(
    locale,
    resource,
    "members",
    { page: 1, limit: REMOTE_COMBOBOX_LIMIT, search: params.search },
    params.signal
  );
  if (params.signal?.aborted) return [];
  return items.map((row) => ({
    value: String(row.id),
    label: row.name,
  }));
}

export async function loadOrderSalesProductBrowseFilters(
  locale: string,
  resource: OrderSalesFormResource,
  facet: "categories" | "brands",
  params: ProductFiltersParams & { signal?: AbortSignal } = {}
): Promise<{ items: ProductFilterItem[] }> {
  const { signal, ...rest } = params;
  const res = await fetchOrderSalesFormFilters(
    locale,
    resource,
    facet,
    rest,
    signal
  );
  return { items: res.items as ProductFilterItem[] };
}

export async function loadOrderSalesCarBrandComboboxOptions(
  locale: string,
  resource: OrderSalesFormResource,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchOrderSalesFormFilters(
    locale,
    resource,
    "cars",
    {
      page: 1,
      limit: REMOTE_COMBOBOX_LIMIT,
      search: params.search,
      typeCar: "brand",
      isActive: true,
    },
    params.signal
  );
  if (params.signal?.aborted) return [];
  return filterItemsToComboboxOptions(res.items as ProductFilterItem[]);
}

export async function loadOrderSalesCarModelComboboxOptions(
  locale: string,
  resource: OrderSalesFormResource,
  params: { search: string; signal?: AbortSignal; parentId?: number }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchOrderSalesFormFilters(
    locale,
    resource,
    "cars",
    {
      page: 1,
      limit: REMOTE_COMBOBOX_LIMIT,
      search: params.search,
      typeCar: "model",
      parentId: params.parentId,
      isActive: true,
    },
    params.signal
  );
  if (params.signal?.aborted) return [];
  return filterItemsToComboboxOptions(res.items as ProductFilterItem[]);
}

export async function loadOrderSalesCategoryComboboxOptions(
  locale: string,
  resource: OrderSalesFormResource,
  params: { search: string; signal?: AbortSignal }
): Promise<RemoteComboboxOption[]> {
  if (params.signal?.aborted) return [];
  const res = await fetchOrderSalesFormFilters(
    locale,
    resource,
    "categories",
    {
      page: 1,
      limit: REMOTE_COMBOBOX_LIMIT,
      search: params.search.trim() || undefined,
    },
    params.signal
  );
  if (params.signal?.aborted) return [];
  return filterItemsToComboboxOptions(res.items as ProductFilterItem[]);
}

export async function resolveOrderSalesCategoryLabel(
  locale: string,
  resource: OrderSalesFormResource,
  value: string
): Promise<string | null> {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchOrderSalesFormFilters(locale, resource, "categories", {
      id,
      limit: 1,
    });
    return res.items[0]?.name ?? null;
  } catch {
    return null;
  }
}

export async function resolveOrderSalesCarBrandLabel(
  locale: string,
  resource: OrderSalesFormResource,
  id: number
): Promise<string> {
  const res = await fetchOrderSalesFormFilters(locale, resource, "cars", {
    page: 1,
    limit: 1,
    id,
    typeCar: "brand",
  });
  return res.items[0]?.name ?? String(id);
}

export async function resolveOrderSalesCarModelLabel(
  locale: string,
  resource: OrderSalesFormResource,
  id: number
): Promise<string> {
  const res = await fetchOrderSalesFormFilters(locale, resource, "cars", {
    page: 1,
    limit: 1,
    id,
    typeCar: "model",
  });
  return res.items[0]?.name ?? String(id);
}
