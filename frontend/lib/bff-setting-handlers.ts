import type { NextResponse } from "next/server";

import { createSystemCrudHandlers } from "@/lib/bff-system-crud";
import { proxyAuthedBackendJson } from "@/lib/bff-backend";

export type SettingLangSegment =
  | "banks"
  | "payment-methods"
  | "sale-channels"
  | "claim-reasons"
  | "prefixes";

export type SettingFlatSegment = "codes";

function langCrud(segment: SettingLangSegment) {
  return createSystemCrudHandlers(`/v1/setting/${segment}`);
}

function flatCrud(segment: SettingFlatSegment) {
  return createSystemCrudHandlers(`/v1/setting/${segment}`);
}

export async function handleSettingLangListGet(
  request: Request,
  segment: SettingLangSegment
): Promise<NextResponse> {
  return langCrud(segment).listGet(request);
}

export async function handleSettingLangCreate(
  request: Request,
  segment: SettingLangSegment
): Promise<NextResponse> {
  return langCrud(segment).create(request);
}

export async function handleSettingLangGet(
  request: Request,
  segment: SettingLangSegment,
  id: string
): Promise<NextResponse> {
  return langCrud(segment).getById(request, id);
}

export async function handleSettingLangPatch(
  request: Request,
  segment: SettingLangSegment,
  id: string
): Promise<NextResponse> {
  return langCrud(segment).patchById(request, id);
}

export async function handleSettingLangDelete(
  request: Request,
  segment: SettingLangSegment,
  id: string
): Promise<NextResponse> {
  return langCrud(segment).deleteById(request, id);
}

export async function handleSettingLangReorder(
  request: Request,
  segment: SettingLangSegment
): Promise<NextResponse> {
  return langCrud(segment).reorder(request);
}

export async function handleSettingCodeListGet(request: Request): Promise<NextResponse> {
  return flatCrud("codes").listGet(request);
}

export async function handleSettingCodeCreate(request: Request): Promise<NextResponse> {
  return flatCrud("codes").create(request);
}

export async function handleSettingCodeGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return flatCrud("codes").getById(request, id);
}

export async function handleSettingCodePatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return flatCrud("codes").patchById(request, id);
}

export async function handleSettingCodeDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return flatCrud("codes").deleteById(request, id);
}

export async function handleSettingCodeReorder(request: Request): Promise<NextResponse> {
  return flatCrud("codes").reorder(request);
}

export async function handleSettingVatGet(request: Request): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, "/v1/setting/vat");
}

export async function handleSettingVatPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  const { readJsonBody } = await import("@/lib/bff-system-crud");
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, `/v1/setting/vat/${id}`, {
    method: "PATCH",
    body: JSON.stringify(parsed.body),
  });
}
