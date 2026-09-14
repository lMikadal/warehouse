import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendFetch, parseApiError } from "@/lib/api-server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";

export function localeFromRequest(request: Request): string {
  return (
    request.headers.get("accept-language")?.split(",")[0]?.slice(0, 2) ?? "th"
  );
}

export async function accessTokenOrUnauthorized(): Promise<
  { token: string } | NextResponse
> {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  return { token };
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
