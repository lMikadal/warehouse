import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/order/orders";
const crud = createSystemCrudHandlers(BASE);

export const handlePickingListGet = crud.listGet;

export const handlePickingCountGet = (r: Request) =>
  proxyListGet(r, `${BASE}/count`);
export const handlePickingFiltersGet = (r: Request) =>
  proxyListGet(r, `${BASE}/filters`);
export const handlePickingVatGet = (r: Request) => proxyListGet(r, `${BASE}/vat`);
export const handlePickingItemsGet = (r: Request) =>
  proxyListGet(r, `${BASE}/items`);
export const handlePickingMemberGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/members/${id}`);
export const handlePickingFamilyGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/family`);
export const handlePickingPaymentsGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/payments`);

async function forward(
  request: Request,
  path: string,
  method: "POST" | "PATCH"
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, path, { method, body: parsed.body });
}

export const handlePickingCreate = (r: Request) => forward(r, BASE, "POST");
export const handlePickingVerifyCredit = (r: Request) =>
  forward(r, `${BASE}/verify-credit`, "POST");
export const handlePickingVerifyDiscount = (r: Request) =>
  forward(r, `${BASE}/verify-discount`, "POST");
export const handlePickingPaymentCreate = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/payments`, "POST");
export const handlePickingPaymentPatch = (
  r: Request,
  id: string,
  paymentId: string
) => forward(r, `${BASE}/${id}/payments/${paymentId}`, "PATCH");
export const handlePickingStatusPatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/status`, "PATCH");
export const handlePickingShippingPatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/shipping`, "PATCH");
export const handlePickingItemPatch = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}`, "PATCH");
