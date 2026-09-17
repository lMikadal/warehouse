import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/warehouse/lists";

const crud = createSystemCrudHandlers(BASE);

export async function handleWarehouseListGet(
  request: Request
): Promise<NextResponse> {
  return crud.listGet(request);
}

export async function handleWarehouseCreate(
  request: Request
): Promise<NextResponse> {
  return crud.create(request);
}

export async function handleWarehouseGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.getById(request, id);
}

export async function handleWarehousePatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.patchById(request, id);
}

export async function handleWarehouseDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.deleteById(request, id);
}

export async function handleWarehouseReorder(
  request: Request
): Promise<NextResponse> {
  return crud.reorder(request);
}

export async function handleWarehouseMove(
  request: Request
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/move`, {
    method: "PATCH",
    body: parsed.body,
  });
}

export async function handleWarehouseStats(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${BASE}/${id}/stats`);
}

export async function handleWarehouseTree(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${BASE}/${id}/tree`);
}

export async function handleWarehouseConditionsPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/${id}/conditions`, {
    method: "PATCH",
    body: parsed.body,
  });
}
