import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";

export async function handleSystemLanguagesListGet(
  request: Request
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/v1/system/languages?${qs}` : "/v1/system/languages";
  return proxyAuthedBackendJson(request, path);
}

export async function handleSystemLanguageCreate(
  request: Request
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, "/v1/system/languages", {
    method: "POST",
    body,
  });
}

export async function handleSystemLanguageGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `/v1/system/languages/${id}`);
}

export async function handleSystemLanguagePatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, `/v1/system/languages/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function handleSystemLanguageDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `/v1/system/languages/${id}`, {
    method: "DELETE",
  });
}

export async function handleSystemLanguageReorder(
  request: Request
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, "/v1/system/languages/reorder", {
    method: "PATCH",
    body,
  });
}
