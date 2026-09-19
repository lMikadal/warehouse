import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import { readJsonBody } from "@/lib/bff-system-crud";

const BASE = "/v1/order/compares";

export async function handleOrderCompareTreeGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `${BASE}/tree?${qs}` : `${BASE}/tree`;
  return proxyAuthedBackendJson(request, path);
}

export async function handleOrderCompareRulesGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `${BASE}/rules?${qs}` : `${BASE}/rules`;
  return proxyAuthedBackendJson(request, path);
}

export async function handleOrderCompareRulesPut(
  request: Request
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/rules`, {
    method: "PUT",
    body: parsed.body,
  });
}

export async function handleOrderCompareExportGet(
  request: Request
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${BASE}/export`);
}

export async function handleOrderCompareImportPost(
  request: Request
): Promise<NextResponse> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `${BASE}/import`, {
    method: "POST",
    body: parsed.body,
  });
}
