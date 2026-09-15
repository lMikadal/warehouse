import type { NextResponse } from "next/server";

import {
  createSystemCrudHandlers,
  proxyListGet,
} from "@/lib/bff-system-crud";

const roleCrud = createSystemCrudHandlers("/v1/admin/roles");
const userCrud = createSystemCrudHandlers("/v1/admin/users");

export const handleAdminRolesListGet: (
  request: Request
) => Promise<NextResponse> = roleCrud.listGet;

export const handleAdminRoleCreate: (
  request: Request
) => Promise<NextResponse> = roleCrud.create;

export async function handleAdminRoleGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return roleCrud.getById(request, id);
}

export async function handleAdminRolePatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return roleCrud.patchById(request, id);
}

export async function handleAdminRoleDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return roleCrud.deleteById(request, id);
}

export const handleAdminUsersListGet: (
  request: Request
) => Promise<NextResponse> = userCrud.listGet;

export async function handleAdminUserFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, "/v1/admin/users/filters");
}

export const handleAdminUserCreate: (
  request: Request
) => Promise<NextResponse> = userCrud.create;

export async function handleAdminUserGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.getById(request, id);
}

export async function handleAdminUserPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.patchById(request, id);
}

export async function handleAdminUserDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.deleteById(request, id);
}
