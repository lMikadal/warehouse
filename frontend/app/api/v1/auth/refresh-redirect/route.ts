import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SSR_REFRESH_TRIED_COOKIE,
} from "@/lib/auth-cookies";
import {
  authCookieOptions,
  getLandingPathCookie,
  refreshAccessTokenFromCookies,
} from "@/lib/auth-server";

function safeAdminReturnPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("/admin/login")) {
    return null;
  }
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnParam = safeAdminReturnPath(url.searchParams.get("return"));
  const landing = (await getLandingPathCookie()) || "/admin/system/menu";
  const returnTo = returnParam ?? landing;

  const access = await refreshAccessTokenFromCookies();
  if (!access) {
    const login = NextResponse.redirect(new URL("/admin/login", request.url));
    for (const name of [
      ACCESS_TOKEN_COOKIE,
      REFRESH_TOKEN_COOKIE,
      LANDING_PATH_COOKIE,
      SSR_REFRESH_TRIED_COOKIE,
    ]) {
      login.cookies.delete(name);
    }
    return login;
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(SSR_REFRESH_TRIED_COOKIE, "1", authCookieOptions(120));
  return response;
}
