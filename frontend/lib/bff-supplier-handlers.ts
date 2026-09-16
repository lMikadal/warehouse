import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  readJsonBody,
} from "@/lib/bff-system-crud";

const userCrud = createSystemCrudHandlers("/v1/supplier/users");

export const handleSupplierUsersListGet: (
  request: Request
) => Promise<NextResponse> = userCrud.listGet;

export const handleSupplierUserCreate: (
  request: Request
) => Promise<NextResponse> = userCrud.create;

export async function handleSupplierUserGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.getById(request, id);
}

export async function handleSupplierUserPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.patchById(request, id);
}

export async function handleSupplierUserDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.deleteById(request, id);
}

async function proxyNested(
  request: Request,
  path: string,
  method: "POST" | "PATCH" | "DELETE"
): Promise<NextResponse> {
  if (method === "DELETE") {
    return proxyAuthedBackendJson(request, path, { method: "DELETE" });
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, path, {
    method,
    body: parsed.body,
  });
}

export async function handleSupplierContactCreate(
  request: Request,
  supplierId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/contacts`,
    "POST"
  );
}

export async function handleSupplierContactPatch(
  request: Request,
  supplierId: string,
  contactId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/contacts/${contactId}`,
    "PATCH"
  );
}

export async function handleSupplierContactDelete(
  request: Request,
  supplierId: string,
  contactId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/contacts/${contactId}`,
    "DELETE"
  );
}

export async function handleSupplierContactReorder(
  request: Request,
  supplierId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/contacts/reorder`,
    "PATCH"
  );
}

export async function handleSupplierBankCreate(
  request: Request,
  supplierId: string
): Promise<NextResponse> {
  return proxyNested(request, `/v1/supplier/users/${supplierId}/banks`, "POST");
}

export async function handleSupplierBankReorder(
  request: Request,
  supplierId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/banks/reorder`,
    "PATCH"
  );
}

export async function handleSupplierBankPatch(
  request: Request,
  supplierId: string,
  bankId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/banks/${bankId}`,
    "PATCH"
  );
}

export async function handleSupplierBankDelete(
  request: Request,
  supplierId: string,
  bankId: string
): Promise<NextResponse> {
  return proxyNested(
    request,
    `/v1/supplier/users/${supplierId}/banks/${bankId}`,
    "DELETE"
  );
}
