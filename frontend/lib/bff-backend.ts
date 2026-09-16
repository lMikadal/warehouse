import { NextResponse } from "next/server";

import { apiBaseUrl, backendFetch, parseApiError } from "@/lib/api-server";
import {
  getValidAccessToken,
  refreshAccessTokenFromCookies,
} from "@/lib/auth-server";

export function localeFromRequest(request: Request): string {
  return (
    request.headers.get("accept-language")?.split(",")[0]?.slice(0, 2) ?? "th"
  );
}

function unauthorizedJson(): NextResponse {
  return NextResponse.json({ code: "unauthorized" }, { status: 401 });
}

type AuthedFetchOptions = {
  method?: string;
  body?: unknown;
  locale: string;
  token: string;
};

export async function authedBackendFetch(
  path: string,
  { method = "GET", body, locale, token }: AuthedFetchOptions
): Promise<Response> {
  return backendFetch(path, { method, body, accessToken: token, locale });
}

type AuthedFormOptions = {
  method?: string;
  body: FormData;
  locale: string;
  token: string;
};

export async function authedBackendForm(
  path: string,
  { method = "POST", body, locale, token }: AuthedFormOptions
): Promise<Response> {
  const segment = path.replace(/^\//, "").replace(/^v1\//, "");
  const url = `${apiBaseUrl()}/v1/${segment}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": locale,
    Authorization: `Bearer ${token}`,
  };
  return fetch(url, { method, headers, body, cache: "no-store" });
}

export async function proxyAuthedBackendForm(
  request: Request,
  path: string,
  init: { method?: string; body: FormData } = { body: new FormData() }
): Promise<NextResponse> {
  const locale = localeFromRequest(request);
  let token = await getValidAccessToken();
  if (!token) {
    return unauthorizedJson();
  }

  let res = await authedBackendForm(path, {
    method: init.method ?? "POST",
    body: init.body,
    locale,
    token,
  });

  if (res.status === 401) {
    token = await refreshAccessTokenFromCookies();
    if (!token) {
      return unauthorizedJson();
    }
    res = await authedBackendForm(path, {
      method: init.method ?? "POST",
      body: init.body,
      locale,
      token,
    });
  }

  if (!res.ok) {
    return proxyErrorJson(res);
  }
  return proxyJsonResponse(res);
}

export async function proxyJsonResponse(res: Response): Promise<NextResponse> {
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const text = await res.text();
  if (!text) {
    return new NextResponse(null, { status: res.status });
  }
  try {
    const data = JSON.parse(text) as unknown;
    return NextResponse.json(data, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}

export async function proxyErrorJson(res: Response): Promise<NextResponse> {
  const err = await parseApiError(res);
  return NextResponse.json(
    { code: err.code ?? "request_failed", message: err.message },
    { status: res.status }
  );
}

type ProxyAuthedInit = {
  method?: string;
  body?: unknown;
};

export async function proxyAuthedBackendJson(
  request: Request,
  path: string,
  init: ProxyAuthedInit = {}
): Promise<NextResponse> {
  const locale = localeFromRequest(request);
  let token = await getValidAccessToken();
  if (!token) {
    return unauthorizedJson();
  }

  let res = await authedBackendFetch(path, {
    method: init.method,
    body: init.body,
    locale,
    token,
  });

  if (res.status === 401) {
    token = await refreshAccessTokenFromCookies();
    if (!token) {
      return unauthorizedJson();
    }
    res = await authedBackendFetch(path, {
      method: init.method,
      body: init.body,
      locale,
      token,
    });
  }

  if (!res.ok) {
    return proxyErrorJson(res);
  }
  return proxyJsonResponse(res);
}
