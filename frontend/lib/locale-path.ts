import { routing } from "@/i18n/routing";

/** Strip leading `/th` or `/en` from a pathname; default locale has no prefix. */
export function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

/** Non-default locale prefix for redirects (e.g. `/en`), or empty for default `th`. */
export function localePrefixForRequest(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return `/${locale}`;
    }
  }
  return "";
}

export function loginPathWithCallback(callbackPath?: string): string {
  const base = "/admin/login";
  if (!callbackPath || callbackPath === "/admin/login") {
    return base;
  }
  const qs = new URLSearchParams({ callbackUrl: callbackPath });
  return `${base}?${qs.toString()}`;
}
