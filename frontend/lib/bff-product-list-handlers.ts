import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const itemsBase = "/v1/product/items";
const listsBase = "/v1/product/lists";

const itemsCrud = createSystemCrudHandlers(itemsBase);
const listsCrud = createSystemCrudHandlers(listsBase);

export async function handleProductItemsListGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, itemsBase);
}

export async function handleProductItemsFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${itemsBase}/filters`);
}

export async function handleProductListsFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${listsBase}/filters`);
}

export async function handleProductItemPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return itemsCrud.patchById(request, id);
}

export async function handleProductItemDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return itemsCrud.deleteById(request, id);
}

export async function handleProductItemWarehousePlacements(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(
    request,
    `${itemsBase}/${id}/warehouse-placements`
  );
}

export async function handleProductItemHistoryPurchase(
  request: Request,
  id: string
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `${itemsBase}/${id}/history/purchase?${qs}`
    : `${itemsBase}/${id}/history/purchase`;
  return proxyAuthedBackendJson(request, path);
}

export async function handleProductItemHistorySales(
  request: Request,
  id: string
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `${itemsBase}/${id}/history/sales?${qs}`
    : `${itemsBase}/${id}/history/sales`;
  return proxyAuthedBackendJson(request, path);
}

export async function handleProductListsCreate(
  request: Request
): Promise<NextResponse> {
  return listsCrud.create(request);
}

export async function handleProductListGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return listsCrud.getById(request, id);
}

export async function handleProductListPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return listsCrud.patchById(request, id);
}

export async function handleProductListDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return listsCrud.deleteById(request, id);
}

export async function handleProductListCars(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${listsBase}/${id}/cars`);
}

export async function handleProductListPatchBody(
  request: Request,
  id: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${listsBase}/${id}`, {
    method: "PATCH",
    body: parsed.body,
  });
}
