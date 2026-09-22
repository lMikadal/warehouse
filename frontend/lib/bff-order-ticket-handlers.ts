import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/order/tickets";
const crud = createSystemCrudHandlers(BASE);

export const handleTicketListGet = crud.listGet;
export const handleTicketCreate = crud.create;
export const handleTicketGet = crud.getById;
export const handleTicketDelete = crud.deleteById;

export const handleTicketCountGet = (r: Request) =>
  proxyListGet(r, `${BASE}/count`);
export const handleTicketFiltersGet = (r: Request) =>
  proxyListGet(r, `${BASE}/filters`);
export const handleTicketItemsGet = (r: Request) =>
  proxyListGet(r, `${BASE}/items`);
export const handleTicketMemberGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/members/${id}`);
export const handleTicketHistoryGet = (r: Request, id: string) =>
  proxyListGet(r, `${BASE}/${id}/history`);

async function forward(
  request: Request,
  path: string,
  method: "POST" | "PUT" | "PATCH"
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, path, { method, body: parsed.body });
}

export const handleTicketPut = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}`, "PUT");
export const handleTicketStatusPatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/status`, "PATCH");
export const handleTicketCustomerPatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/customer`, "PATCH");
export const handleTicketNotePatch = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/note`, "PATCH");
export const handleTicketItemCreate = (r: Request, id: string) =>
  forward(r, `${BASE}/${id}/items`, "POST");
export const handleTicketItemPut = (r: Request, id: string, itemId: string) =>
  forward(r, `${BASE}/${id}/items/${itemId}`, "PUT");
export const handleTicketItemDelete = (
  r: Request,
  id: string,
  itemId: string
) =>
  proxyAuthedBackendJson(r, `${BASE}/${id}/items/${itemId}`, {
    method: "DELETE",
  });
export const handleTicketItemStatusPatch = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}/status`, "PATCH");
export const handleTicketItemRejectCreate = (
  r: Request,
  id: string,
  itemId: string
) => forward(r, `${BASE}/${id}/items/${itemId}/rejects`, "POST");
export const handleTicketItemRejectStatusPatch = (
  r: Request,
  id: string,
  rejectId: string
) => forward(r, `${BASE}/${id}/item-rejects/${rejectId}/status`, "PATCH");
