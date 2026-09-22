import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/order/receives";
const crud = createSystemCrudHandlers(BASE);

export const handleReceiveListGet = crud.listGet;
export const handleReceiveGet = crud.getById;

export const handleReceiveCountGet = (r: Request) =>
  proxyListGet(r, `${BASE}/count`);
export const handleReceiveFiltersGet = (r: Request) =>
  proxyListGet(r, `${BASE}/filters`);
export const handleReceiveBinsGet = (r: Request) =>
  proxyListGet(r, `${BASE}/bins`);
export const handleReceiveHistoryGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/history`);
export const handleReceiveRejectsGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/rejects`);
export const handleReceivePlacementsGet = (
  r: Request,
  id: string,
  itemId: string
) => proxyListGet(r, `${BASE}/${id}/items/${itemId}/placements`);

async function forward(
  request: Request,
  path: string,
  method: "POST" | "PUT"
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, path, { method, body: parsed.body });
}

export const handleReceiveFilesPut = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/files`, "PUT");
export const handleReceiveItem = (r: Request, id: string, itemId: string) =>
  forward(r, `${BASE}/${id}/items/${itemId}/receive`, "POST");
export const handleReceiveItemReject = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}/rejects`, "POST");
export const handleReceiveItemConvertUnit = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}/convert-unit`, "POST");
export const handleReceiveItemRevertConvertUnit = (
  r: Request,
  id: string,
  itemId: string
) =>
  proxyAuthedBackendJson(
    r,
    `${BASE}/${id}/items/${itemId}/revert-convert-unit`,
    { method: "POST" }
  );
