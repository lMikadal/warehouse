import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import {
  createSystemCrudHandlers,
  readJsonBody,
} from "@/lib/bff-system-crud";

const BASE = "/v1/member/tiers";

const crud = createSystemCrudHandlers(BASE);

export async function handleMemberTierListGet(
  request: Request
): Promise<NextResponse> {
  return crud.listGet(request);
}

export async function handleMemberTierStatsGet(
  request: Request
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${BASE}/stats`);
}

export async function handleMemberTierFiltersGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `${BASE}/filters?${qs}` : `${BASE}/filters`;
  return proxyAuthedBackendJson(request, path);
}

export async function handleMemberTierCreate(
  request: Request
): Promise<NextResponse> {
  return crud.create(request);
}

export async function handleMemberTierGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.getById(request, id);
}

export async function handleMemberTierPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.patchById(request, id);
}

export async function handleMemberTierDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.deleteById(request, id);
}

export async function handleMemberTierReorder(
  request: Request
): Promise<NextResponse> {
  return crud.reorder(request);
}

export async function handleMemberTierMove(
  request: Request
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/move`, {
    method: "PATCH",
    body: parsed.body,
  });
}

export async function handleMemberTierRelationCreate(
  request: Request,
  tierId: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/${tierId}/relations`, {
    method: "POST",
    body: parsed.body,
  });
}

export async function handleMemberTierRelationPatch(
  request: Request,
  tierId: string,
  relationId: string
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(
    request,
    `${BASE}/${tierId}/relations/${relationId}`,
    {
      method: "PATCH",
      body: parsed.body,
    }
  );
}

export async function handleMemberTierRelationDelete(
  request: Request,
  tierId: string,
  relationId: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(
    request,
    `${BASE}/${tierId}/relations/${relationId}`,
    { method: "DELETE" }
  );
}
