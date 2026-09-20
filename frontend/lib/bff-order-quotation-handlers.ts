import type { NextResponse } from "next/server";

import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";
import { proxyAuthedBackendJson } from "@/lib/bff-backend";

const BASE = "/v1/order/quotations";
const crud = createSystemCrudHandlers(BASE);

export const handleQuotationListGet = crud.listGet;
export const handleQuotationCreate = crud.create;
export const handleQuotationGet = crud.getById;
export const handleQuotationPatch = crud.patchById;
export const handleQuotationDelete = crud.deleteById;

export async function handleQuotationCountGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/count`);
}

export async function handleQuotationFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/filters`);
}

export async function handleQuotationVatGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/vat`);
}

export async function handleQuotationItemsGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/items`);
}

export async function handleQuotationMemberGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/members/${id}`);
}

async function postAction(
  request: Request,
  id: string,
  action: string
): Promise<NextResponse> {
  let bodyPayload: unknown = {};
  const len = request.headers.get("content-length");
  if (len !== null && len !== "0") {
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    bodyPayload = parsed.body;
  }
  return proxyAuthedBackendJson(request, `${BASE}/${id}/${action}`, {
    method: "POST",
    body: bodyPayload,
  });
}

export async function handleQuotationStatusPatch(
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

export const handleQuotationSubmit = (r: Request, id: string) =>
  postAction(r, id, "submit");
export const handleQuotationApprove = (r: Request, id: string) =>
  postAction(r, id, "approve");
export const handleQuotationReject = (r: Request, id: string) =>
  postAction(r, id, "reject");
export const handleQuotationReturn = (r: Request, id: string) =>
  postAction(r, id, "return");
export const handleQuotationAccept = (r: Request, id: string) =>
  postAction(r, id, "accept");
export const handleQuotationPayment = (r: Request, id: string) =>
  postAction(r, id, "payment");
export const handleQuotationPicking = (r: Request, id: string) =>
  postAction(r, id, "picking");
export const handleQuotationDuplicate = (r: Request, id: string) =>
  postAction(r, id, "duplicate");
