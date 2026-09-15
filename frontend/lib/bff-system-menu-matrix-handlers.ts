import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";

export async function handleSystemMenuPermissionMatrixGet(
  request: Request
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, "/v1/system/menus/permission-matrix", {
    method: "GET",
  });
}
