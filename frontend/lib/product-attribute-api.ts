import { authFetch } from "@/lib/auth-client";
import type { TreeDropZone } from "@/lib/crud-list-rows";
import type { ProductAttrSegment } from "@/lib/bff-product-handlers";

const BFF = "/api/v1/auth/proxy/product";

export type ProductAttributeRow = {
  id: number;
  parent_id: number | null;
  type_car?: string | null;
  tree_path?: string | null;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_stopped?: boolean;
  updated_at: string;
};

export type ProductAttributeDetail = ProductAttributeRow & {
  names?: { th: string; en: string };
  brand_ids?: number[];
};

type ListResponse = {
  items: ProductAttributeRow[];
  meta: { total: number; page: number; limit: number };
};

export class ProductAttributeApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ProductAttributeApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return new ProductAttributeApiError(
      body.message ?? res.statusText,
      res.status,
      body.code
    );
  } catch {
    return new ProductAttributeApiError(res.statusText, res.status);
  }
}

function bffUrl(segment: ProductAttrSegment, suffix = "") {
  return `${BFF}/${segment}${suffix}`;
}

export type ProductAttributeListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export async function fetchProductAttributes(
  segment: ProductAttrSegment,
  locale: string,
  params: ProductAttributeListParams = {}
): Promise<ListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 100));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.isActive !== undefined) {
    q.set("is_active", params.isActive ? "true" : "false");
  }
  const res = await authFetch(`${bffUrl(segment)}?${q}`, {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as ListResponse;
}

export async function fetchProductAttribute(
  segment: ProductAttrSegment,
  locale: string,
  id: number
): Promise<ProductAttributeDetail> {
  const res = await authFetch(bffUrl(segment, `/${id}`), {
    headers: { Accept: "application/json", "Accept-Language": locale },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ProductAttributeDetail;
}

export type ProductAttributeWriteBody = {
  is_active: boolean;
  names: { th: string; en: string };
  parent_id?: number | null;
  type_car?: string;
  brand_ids?: number[];
};

export async function createProductAttribute(
  segment: ProductAttrSegment,
  locale: string,
  body: ProductAttributeWriteBody
): Promise<number> {
  const res = await authFetch(bffUrl(segment), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { id: number };
  return data.id;
}

export async function patchProductAttribute(
  segment: ProductAttrSegment,
  locale: string,
  id: number,
  body: Record<string, unknown>
): Promise<void> {
  const res = await authFetch(bffUrl(segment, `/${id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": locale,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
}

export async function deleteProductAttribute(
  segment: ProductAttrSegment,
  id: number
): Promise<void> {
  const res = await authFetch(bffUrl(segment, `/${id}`), { method: "DELETE" });
  if (!res.ok) throw await parseError(res);
}

export async function reorderProductAttributes(
  segment: ProductAttrSegment,
  dragId: number,
  targetId: number
): Promise<void> {
  const res = await authFetch(bffUrl(segment, "/reorder"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drag_id: dragId, target_id: targetId }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function moveProductCategory(
  dragId: number,
  targetId: number,
  zone: TreeDropZone
): Promise<void> {
  const res = await authFetch(bffUrl("categories", "/move"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drag_id: dragId, target_id: targetId, zone }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function moveProductCars(
  dragId: number,
  targetId: number,
  zone: TreeDropZone
): Promise<void> {
  const res = await authFetch(bffUrl("cars", "/move"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drag_id: dragId, target_id: targetId, zone }),
  });
  if (!res.ok) throw await parseError(res);
}
