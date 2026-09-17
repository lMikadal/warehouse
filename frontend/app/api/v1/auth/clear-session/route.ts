import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SSR_REFRESH_TRIED_COOKIE,
} from "@/lib/auth-cookies";
function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/admin")) {
    return "/admin/login";
  }
  return raw;
}

/** Clears auth cookies then redirects — breaks layout ↔ login middleware loops. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("return"));

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  for (const name of [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    LANDING_PATH_COOKIE,
    SSR_REFRESH_TRIED_COOKIE,
  ]) {
    response.cookies.delete(name);
  }
  return response;
}
