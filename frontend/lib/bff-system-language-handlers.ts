import { NextResponse } from "next/server";

import {
  accessTokenOrUnauthorized,
  authedBackendFetch,
  localeFromRequest,
  proxyErrorJson,
  proxyJsonResponse,
} from "@/lib/bff-backend";

export async function handleSystemLanguagesListGet(
  request: Request
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/v1/system/languages?${qs}` : "/v1/system/languages";

  const res = await authedBackendFetch(path, {
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemLanguageCreate(
  request: Request
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const res = await authedBackendFetch("/v1/system/languages", {
    method: "POST",
    body,
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemLanguageGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const res = await authedBackendFetch(`/v1/system/languages/${id}`, {
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemLanguagePatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const res = await authedBackendFetch(`/v1/system/languages/${id}`, {
    method: "PATCH",
    body,
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemLanguageDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const res = await authedBackendFetch(`/v1/system/languages/${id}`, {
    method: "DELETE",
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemLanguageReorder(
  request: Request
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const res = await authedBackendFetch("/v1/system/languages/reorder", {
    method: "PATCH",
    body,
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}
