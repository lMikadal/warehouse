import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import { proxyNestedMutate } from "@/lib/bff-nested-mutate";
import {
  createSystemCrudHandlers,
  proxyListGet,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/member/users";
const userCrud = createSystemCrudHandlers(BASE);

export const handleMemberUserListGet: (
  request: Request
) => Promise<NextResponse> = userCrud.listGet;

export async function handleMemberUserStatsGet(
  request: Request
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${BASE}/stats`);
}

export async function handleMemberUserFiltersGet(
  request: Request
): Promise<NextResponse> {
  return proxyListGet(request, `${BASE}/filters`);
}

export const handleMemberUserCreate: (
  request: Request
) => Promise<NextResponse> = userCrud.create;

export async function handleMemberUserGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.getById(request, id);
}

export async function handleMemberUserPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.patchById(request, id);
}

export async function handleMemberUserDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return userCrud.deleteById(request, id);
}

export async function handleMemberUserFileCreate(
  request: Request,
  userId: string
): Promise<NextResponse> {
  return proxyNestedMutate(request, `${BASE}/${userId}/files`, "POST");
}

export async function handleMemberUserFileReorder(
  request: Request,
  userId: string
): Promise<NextResponse> {
  return proxyNestedMutate(request, `${BASE}/${userId}/files/reorder`, "PATCH");
}

export async function handleMemberUserFileDelete(
  request: Request,
  userId: string,
  fileId: string
): Promise<NextResponse> {
  return proxyNestedMutate(
    request,
    `${BASE}/${userId}/files/${fileId}`,
    "DELETE"
  );
}

export async function handleMemberUserDiscountCreate(
  request: Request,
  userId: string
): Promise<NextResponse> {
  return proxyNestedMutate(request, `${BASE}/${userId}/discounts`, "POST");
}

export async function handleMemberUserDiscountPatch(
  request: Request,
  userId: string,
  discountId: string
): Promise<NextResponse> {
  return proxyNestedMutate(
    request,
    `${BASE}/${userId}/discounts/${discountId}`,
    "PATCH"
  );
}

export async function handleMemberUserDiscountDelete(
  request: Request,
  userId: string,
  discountId: string
): Promise<NextResponse> {
  return proxyNestedMutate(
    request,
    `${BASE}/${userId}/discounts/${discountId}`,
    "DELETE"
  );
}

export async function handleMemberUserHistoryCreate(
  request: Request,
  userId: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/${userId}/histories`, {
    method: "POST",
    body: parsed.body,
  });
}
