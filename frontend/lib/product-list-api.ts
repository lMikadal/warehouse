import { authFetch } from "@/lib/auth-client";

const BFF = "/api/v1/auth/proxy/product";

export type ProductItemBrowseRow = {
  id: number;
  product_list_id: number;
  sku: string;
  price: number;
  unit: string;
  qty_per_unit: number;
  minimum_stock: number;
  is_active: boolean;
  is_stopped: boolean;
  updated_at: string;
  tag: string;
  is_new: boolean;
  product_brand_id?: number | null;
  product_category_id?: number | null;
  name: string;
  brand_name: string;
  category_name: string;
  total_stock: number;
  low_stock: boolean;
  warehouse_root_count: number;
  car_count: number;
  car_summary?: string;
  cover_system_file_id?: number | null;
};

type ListResponse<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};

export class ProductListApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ProductListApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new ProductListApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new ProductListApiError(res.statusText, res.status);
  }
}

export type ProductItemListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isNew?: boolean;
  productCategoryId?: number;
  productBrandId?: number;
  sort?: string;
  order?: "asc" | "desc";
};

export async function fetchProductItems(
  locale: string,
  params: ProductItemListParams = {}
): Promise<ListResponse<ProductItemBrowseRow>> {
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
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  const res = await authFetch(`${BFF}/items?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ListResponse<ProductItemBrowseRow>;
}

export async function patchProductItemActive(
  id: number,
  isActive: boolean
): Promise<void> {
  const res = await authFetch(`${BFF}/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchProductItemStopped(
  id: number,
  isStopped: boolean
): Promise<void> {
  const res = await authFetch(`${BFF}/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_stopped: isStopped }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deleteProductItem(id: number): Promise<void> {
  const res = await authFetch(`${BFF}/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw await parseError(res);
}

export type WarehousePlacementRow = {
  warehouse_name: string;
  zone_name: string;
  shelf_name: string;
  rack_name: string;
  bin_name: string;
  quantity: number;
};

export type ProductItemStockRow = {
  id: number;
  product_item_warehouse_id: number;
  bin_id: number;
  bin_label: string;
  order_quantity: number;
  order_free_gift: number;
  quantity: number;
  remain_quantity: number;
  cost_per_unit: number;
  discount_per_unit: number;
  sell_price: number;
  is_used: boolean;
  received_at?: string | null;
  supplier_user_id?: number | null;
};

export async function fetchProductItemStocks(
  locale: string,
  itemId: number,
  params: { page?: number; limit?: number } = {}
): Promise<ListResponse<ProductItemStockRow>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 10));
  const res = await authFetch(`${BFF}/items/${itemId}/stocks?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ListResponse<ProductItemStockRow>;
}

export async function fetchProductItemWarehousePlacements(
  locale: string,
  itemId: number
): Promise<WarehousePlacementRow[]> {
  const res = await authFetch(`${BFF}/items/${itemId}/warehouse-placements`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { items: WarehousePlacementRow[] };
  return body.items ?? [];
}

export type CarFitmentRow = {
  id: number;
  brand_name: string;
  model_name: string;
  engine_name: string;
  year_start?: number | null;
  year_end?: number | null;
  gear_type?: string | null;
};

export async function fetchProductListCars(
  locale: string,
  listId: number
): Promise<CarFitmentRow[]> {
  const res = await authFetch(`${BFF}/lists/${listId}/cars`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { items: CarFitmentRow[] };
  return body.items ?? [];
}

export type LocaleBlock = {
  name: string;
  sub_name?: string;
  description?: string;
};

export type ListItemFileBody = {
  id?: number | null;
  system_file_id: number;
  sort_order: number;
};

export type ListItemBody = {
  id?: number | null;
  sku?: string;
  barcode?: string;
  qrcode?: string;
  price: number;
  price_wholesale: number;
  type_price: string;
  unit: string;
  qty_per_unit: number;
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  minimum_stock: number;
  old_product_item_id?: number | null;
  is_new: boolean;
  is_active: boolean;
  is_stopped: boolean;
  is_authentic: boolean;
  promotion?: string;
  total_stock?: number;
  warehouse_root_count?: number;
  low_stock?: boolean;
  names: { th: string; en: string };
  channel_prices?: { setting_sale_channel_id: number; price: number }[];
  suppliers?: {
    supplier_user_id: number;
    cost_price: number;
    discount: number;
    discount_type: string;
  }[];
  warehouse_placements?: { id?: number | null; bin_id: number }[];
  files?: ListItemFileBody[];
  /** Client-only: expand pricing card on first render */
  _open?: boolean;
  /** Client-only: stable key for new drafts */
  _draftKey?: string;
};

export type ListCarBody = {
  id?: number | null;
  product_attribute_brand_id?: number | null;
  product_attribute_model_id?: number | null;
  product_attribute_engine_id: number;
  gear_type?: string | null;
  year_start?: number | null;
  year_end?: number | null;
};

export type ProductListAggregate = {
  id?: number;
  sku: string;
  supplier_sku?: string;
  tag?: string;
  note?: string;
  is_active: boolean;
  product_brand_id?: number | null;
  product_category_id?: number | null;
  updated_at?: string;
  languages: { th: LocaleBlock; en: LocaleBlock };
  factory_codes?: string[];
  other_codes?: string[];
  supplier_ids?: number[];
  cars?: ListCarBody[];
  items: ListItemBody[];
};

export async function fetchProductList(
  locale: string,
  id: number
): Promise<ProductListAggregate> {
  const res = await authFetch(`${BFF}/lists/${id}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ProductListAggregate;
}

export async function createProductList(body: ProductListAggregate): Promise<number> {
  const res = await authFetch(`${BFF}/lists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { id: number };
  return data.id;
}

export async function updateProductList(
  id: number,
  body: ProductListAggregate
): Promise<void> {
  const res = await authFetch(`${BFF}/lists/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function patchProductItemFull(
  id: number,
  body: ListItemBody
): Promise<void> {
  const res = await authFetch(`${BFF}/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export type HistoryResponse = {
  summary: Record<string, unknown>;
  groups: unknown[];
  meta: { total: number; page: number; limit: number };
};

export async function fetchProductItemHistoryPurchase(
  locale: string,
  itemId: number,
  params: Record<string, string> = {}
): Promise<HistoryResponse> {
  const q = new URLSearchParams(params);
  const res = await authFetch(
    `${BFF}/items/${itemId}/history/purchase?${q}`,
    { headers: { Accept: "application/json", "Accept-Language": locale } }
  );
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as HistoryResponse;
}

export async function fetchProductItemHistorySales(
  locale: string,
  itemId: number,
  params: Record<string, string> = {}
): Promise<HistoryResponse> {
  const q = new URLSearchParams(params);
  const res = await authFetch(`${BFF}/items/${itemId}/history/sales?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as HistoryResponse;
}
