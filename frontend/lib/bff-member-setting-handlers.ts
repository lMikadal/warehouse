import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import { createSystemCrudHandlers } from "@/lib/bff-system-crud";

export type MemberSettingSegment = "credits" | "groups" | "businesses";

function segmentBase(segment: MemberSettingSegment): string {
  return `/v1/member/settings/${segment}`;
}

function crud(segment: MemberSettingSegment) {
  return createSystemCrudHandlers(segmentBase(segment));
}

export async function handleMemberSettingListGet(
  request: Request,
  segment: MemberSettingSegment
): Promise<NextResponse> {
  return crud(segment).listGet(request);
}

export async function handleMemberSettingCreate(
  request: Request,
  segment: MemberSettingSegment
): Promise<NextResponse> {
  return crud(segment).create(request);
}

export async function handleMemberSettingGet(
  request: Request,
  segment: MemberSettingSegment,
  id: string
): Promise<NextResponse> {
  return crud(segment).getById(request, id);
}

export async function handleMemberSettingPatch(
  request: Request,
  segment: MemberSettingSegment,
  id: string
): Promise<NextResponse> {
  return crud(segment).patchById(request, id);
}

export async function handleMemberSettingDelete(
  request: Request,
  segment: MemberSettingSegment,
  id: string
): Promise<NextResponse> {
  return crud(segment).deleteById(request, id);
}

export async function handleMemberBusinessFiltersGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `${segmentBase("businesses")}/filters?${qs}`
    : `${segmentBase("businesses")}/filters`;
  return proxyAuthedBackendJson(request, path);
}

export async function handleMemberBusinessRelationsGet(
  request: Request,
  businessId: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(
    request,
    `${segmentBase("businesses")}/${businessId}/relations`
  );
}

export async function handleMemberRelationPatch(
  request: Request,
  relationId: string
): Promise<NextResponse> {
  const body = await request.json();
  return proxyAuthedBackendJson(
    request,
    `/v1/member/settings/relations/${relationId}`,
    { method: "PATCH", body }
  );
}

export async function handleMemberRelationDelete(
  request: Request,
  relationId: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(
    request,
    `/v1/member/settings/relations/${relationId}`,
    { method: "DELETE" }
  );
}
