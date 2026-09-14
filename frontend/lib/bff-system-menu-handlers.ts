import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";

export async function handleSystemMenusListGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/v1/system/menus?${qs}` : "/v1/system/menus";
  return proxyAuthedBackendJson(request, path);
}

export async function handleSystemMenuPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, `/v1/system/menus/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function handleSystemMenuMove(
  request: Request
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, "/v1/system/menus/move", {
    method: "PATCH",
    body,
  });
}
