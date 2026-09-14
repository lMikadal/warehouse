import type { NextResponse } from "next/server";

import { createSystemCrudHandlers } from "@/lib/bff-system-crud";

const languageCrud = createSystemCrudHandlers("/v1/system/languages");

export const handleSystemLanguagesListGet: (
  request: Request
) => Promise<NextResponse> = languageCrud.listGet;

export const handleSystemLanguageCreate: (
  request: Request
) => Promise<NextResponse> = languageCrud.create;

export async function handleSystemLanguageGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return languageCrud.getById(request, id);
}

export async function handleSystemLanguagePatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return languageCrud.patchById(request, id);
}

export async function handleSystemLanguageDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return languageCrud.deleteById(request, id);
}

export const handleSystemLanguageReorder: (
  request: Request
) => Promise<NextResponse> = languageCrud.reorder;
