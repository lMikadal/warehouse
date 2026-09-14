import type { NextResponse } from "next/server";

import {
  createSystemCrudHandlers,
  proxyListGet,
} from "@/lib/bff-system-crud";

const permissionCrud = createSystemCrudHandlers("/v1/system/permissions");

export async function handleSystemPermissionFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, "/v1/system/permissions/filters");
}

export const handleSystemPermissionsListGet: (
  request: Request
) => Promise<NextResponse> = permissionCrud.listGet;

export async function handleSystemPermissionPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return permissionCrud.patchById(request, id);
}
