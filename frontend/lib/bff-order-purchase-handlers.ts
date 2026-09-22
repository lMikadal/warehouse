import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/order/purchases";
const crud = createSystemCrudHandlers(BASE);

export const handlePurchaseListGet = crud.listGet;
export const handlePurchaseCreate = crud.create;
export const handlePurchaseGet = crud.getById;
export const handlePurchaseDelete = crud.deleteById;

export const handlePurchaseCountGet = (r: Request) =>
  proxyListGet(r, `${BASE}/count`);
export const handlePurchaseFiltersGet = (r: Request) =>
  proxyListGet(r, `${BASE}/filters`);
export const handlePurchaseItemsGet = (r: Request) =>
  proxyListGet(r, `${BASE}/items`);
export const handlePurchaseStockHistoryGet = (r: Request) =>
  proxyListGet(r, `${BASE}/stock-history`);
export const handlePurchaseHistoryGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/history`);
export const handlePurchasePaymentsGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/payments`);

async function forward(
  request: Request,
  path: string,
  method: "POST" | "PUT" | "PATCH"
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, path, { method, body: parsed.body });
}

export const handlePurchasePut = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}`, "PUT");
export const handlePurchaseStatusPatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/status`, "PATCH");
export const handlePurchaseWaitingPatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/waiting`, "PATCH");
export const handlePurchaseFilesPut = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/files`, "PUT");
export const handlePurchaseItemCreate = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/items`, "POST");
export const handlePurchaseItemPut = (r: Request, id: string, itemId: string) =>
  forward(r, `${BASE}/${id}/items/${itemId}`, "PUT");
export const handlePurchaseItemDelete = (
  r: Request,
  id: string,
  itemId: string
) =>
  proxyAuthedBackendJson(r, `${BASE}/${id}/items/${itemId}`, {
    method: "DELETE",
  });
export const handlePurchaseItemStatusPatch = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}/status`, "PATCH");
export const handlePurchaseItemConvertUnit = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}/convert-unit`, "POST");
export const handlePurchaseItemRevertConvertUnit = (
  r: Request,
  id: string,
  itemId: string
) =>
  proxyAuthedBackendJson(
    r,
    `${BASE}/${id}/items/${itemId}/revert-convert-unit`,
    { method: "POST" }
  );
export const handlePurchasePaymentCreate = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/payments`, "POST");
export const handlePurchasePaymentDelete = (
  r: Request,
  id: string,
  paymentId: string
) =>
  proxyAuthedBackendJson(r, `${BASE}/${id}/payments/${paymentId}`, {
    method: "DELETE",
  });
