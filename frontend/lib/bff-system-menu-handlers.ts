import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import { proxyListGet, readJsonBody } from "@/lib/bff-system-crud";

export async function handleSystemMenusListGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, "/v1/system/menus");
}

export async function handleSystemMenuGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `/v1/system/menus/${id}`, {
    method: "GET",
  });
}

export async function handleSystemMenuPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyAuthedBackendJson(request, `/v1/system/menus/${id}`, {
    method: "PATCH",
    body: parsed.body,
  });
}

export async function handleSystemMenuMove(
  request: Request
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyAuthedBackendJson(request, "/v1/system/menus/move", {
    method: "PATCH",
    body: parsed.body,
  });
}
