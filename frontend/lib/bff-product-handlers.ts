import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

export type ProductAttrSegment = "categories" | "brands" | "cars";

function base(segment: ProductAttrSegment) {
  return `/v1/product/${segment}`;
}

function crud(segment: ProductAttrSegment) {
  return createSystemCrudHandlers(base(segment));
}

export async function handleProductCategoryFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, "/v1/product/categories/filters");
}

export async function handleProductAttrListGet(
  request: Request,
  segment: ProductAttrSegment
): Promise<NextResponse> {
  return crud(segment).listGet(request);
}

export async function handleProductAttrCreate(
  request: Request,
  segment: ProductAttrSegment
): Promise<NextResponse> {
  return crud(segment).create(request);
}

export async function handleProductAttrGet(
  request: Request,
  segment: ProductAttrSegment,
  id: string
): Promise<NextResponse> {
  return crud(segment).getById(request, id);
}

export async function handleProductAttrPatch(
  request: Request,
  segment: ProductAttrSegment,
  id: string
): Promise<NextResponse> {
  return crud(segment).patchById(request, id);
}

export async function handleProductAttrDelete(
  request: Request,
  segment: ProductAttrSegment,
  id: string
): Promise<NextResponse> {
  return crud(segment).deleteById(request, id);
}

export async function handleProductAttrReorder(
  request: Request,
  segment: ProductAttrSegment
): Promise<NextResponse> {
  return crud(segment).reorder(request);
}

export async function handleProductAttrMove(
  request: Request,
  segment: ProductAttrSegment
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${base(segment)}/move`, {
    method: "PATCH",
    body: parsed.body,
  });
}
