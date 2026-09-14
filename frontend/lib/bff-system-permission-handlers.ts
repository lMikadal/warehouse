import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";

export async function handleSystemPermissionFiltersGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `/v1/system/permissions/filters?${qs}`
    : "/v1/system/permissions/filters";
  return proxyAuthedBackendJson(request, path);
}

export async function handleSystemPermissionsListGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `/v1/system/permissions?${qs}`
    : "/v1/system/permissions";
  return proxyAuthedBackendJson(request, path);
}

export async function handleSystemPermissionPatch(
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

  return proxyAuthedBackendJson(request, `/v1/system/permissions/${id}`, {
    method: "PATCH",
    body,
  });
}
