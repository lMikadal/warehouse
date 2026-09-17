import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SSR_REFRESH_TRIED_COOKIE,
} from "./lib/auth-cookies";
import {
  localePrefixForRequest,
  stripLocalePrefix,
} from "./lib/locale-path";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

function adminRedirectUrl(request: NextRequest, adminPath: string): URL {
  const prefix = localePrefixForRequest(request.nextUrl.pathname);
  return new URL(`${prefix}${adminPath}`, request.url);
}

export default function middleware(request: NextRequest) {
  const adminPath = stripLocalePrefix(request.nextUrl.pathname);
  const isAdminLogin = adminPath === "/admin/login";
  const isAdminArea = adminPath === "/admin" || adminPath.startsWith("/admin/");

  const requestHeaders = new Headers(request.headers);
  if (isAdminArea && !isAdminLogin) {
    requestHeaders.set("x-warehouse-admin-path", adminPath);
  }
  const intlRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const ssrRefreshTried =
    request.cookies.get(SSR_REFRESH_TRIED_COOKIE)?.value === "1";
  const hasSession = Boolean(access || refresh);
  const landing =
    request.cookies.get(LANDING_PATH_COOKIE)?.value || "/admin/system/menu";

  if (isAdminArea) {
    if (!hasSession && !isAdminLogin) {
      const loginUrl = adminRedirectUrl(request, "/admin/login");
      if (adminPath !== "/admin/login") {
        loginUrl.searchParams.set("callbackUrl", adminPath);
      }
      return NextResponse.redirect(loginUrl);
    }
    if (isAdminLogin && ssrRefreshTried) {
      const response = handleI18nRouting(intlRequest);
      for (const name of [
        ACCESS_TOKEN_COOKIE,
        REFRESH_TOKEN_COOKIE,
        SSR_REFRESH_TRIED_COOKIE,
      ]) {
        response.cookies.delete(name);
      }
      return response;
    }
    if (access && isAdminLogin) {
      return NextResponse.redirect(adminRedirectUrl(request, landing));
    }
  }

  return handleI18nRouting(intlRequest);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
