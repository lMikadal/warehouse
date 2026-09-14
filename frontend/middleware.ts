import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
} from "./lib/auth-cookies";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

function localePrefixForRequest(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return `/${locale}`;
    }
  }
  return "";
}

function adminRedirectUrl(request: NextRequest, adminPath: string): URL {
  const prefix = localePrefixForRequest(request.nextUrl.pathname);
  return new URL(`${prefix}${adminPath}`, request.url);
}

export default function middleware(request: NextRequest) {
  const adminPath = stripLocalePrefix(request.nextUrl.pathname);
  const isAdminLogin = adminPath === "/admin/login";
  const isAdminArea = adminPath === "/admin" || adminPath.startsWith("/admin/");
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const landing =
    request.cookies.get(LANDING_PATH_COOKIE)?.value || "/admin/system/menu";

  if (isAdminArea) {
    if (!access && !isAdminLogin) {
      const loginUrl = adminRedirectUrl(request, "/admin/login");
      if (adminPath !== "/admin/login") {
        loginUrl.searchParams.set("callbackUrl", adminPath);
      }
      return NextResponse.redirect(loginUrl);
    }
    if (access && isAdminLogin) {
      return NextResponse.redirect(adminRedirectUrl(request, landing));
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
