"use client";

import { usePathname as useNextPathname } from "next/navigation";
import { useMemo } from "react";

import { routing } from "@/i18n/routing";

function normalizePathname(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw && typeof raw === "object" && "pathname" in raw) {
    const pathname = (raw as { pathname?: unknown }).pathname;
    if (typeof pathname === "string") {
      return pathname;
    }
  }
  return "/";
}

/** Path without locale prefix — for next-intl `router.replace(href, { locale })`. */
function toInternalPath(pathname: string): string {
  for (const loc of routing.locales) {
    if (loc === routing.defaultLocale) {
      continue;
    }
    const prefix = `/${loc}`;
    if (pathname === prefix) {
      return "/";
    }
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname;
}

/** ponytail: Next 16 can yield non-string pathname; next-intl unprefixPathname then throws — read via next/navigation + normalize instead of `@/i18n/navigation` usePathname. */
export function useLocalizedPathname(): string {
  const raw = useNextPathname();
  return useMemo(() => toInternalPath(normalizePathname(raw)), [raw]);
}
