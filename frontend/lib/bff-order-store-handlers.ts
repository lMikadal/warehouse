import type { NextResponse } from "next/server";

import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";
import { proxyAuthedBackendJson } from "@/lib/bff-backend";

const BASE = "/v1/order/store-sales";
const crud = createSystemCrudHandlers(BASE);

export const handleStoreSalesListGet = crud.listGet;
export const handleStoreSalesCreate = crud.create;
export const handleStoreSalesGet = crud.getById;
export const handleStoreSalesPatch = crud.patchById;
export const handleStoreSalesDelete = crud.deleteById;

export async function handleStoreSalesCountGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/count`);
}

export async function handleStoreSalesFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/filters`);
}

export async function handleStoreSalesStatusPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/${id}/status`, {
    method: "PATCH",
    body: parsed.body,
  });
}

export async function handleStoreSalesShippingPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/${id}/shipping`, {
    method: "PATCH",
    body: parsed.body,
  });
}
