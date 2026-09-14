import { cookies } from "next/headers";

import {
  type ApiNavResponse,
  apiNavTreeToAdminNodes,
} from "@/lib/admin-nav-api";
import { backendFetch, parseApiError } from "@/lib/api-server";
import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
  type AuthUser,
} from "@/lib/auth-cookies";
import type { AdminNavNode } from "@/lib/admin-menu-mock";

export async function getAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getLandingPathCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(LANDING_PATH_COOKIE)?.value;
}

export function authCookieOptions(maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function landingCookieOptions(maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);
  jar.delete(LANDING_PATH_COOKIE);
}

export async function fetchAuthMe(
  accessToken: string,
  locale: string
): Promise<AuthUser | null> {
  const res = await backendFetch("/auth/me", { accessToken, locale });
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

export async function fetchAuthNav(
  accessToken: string,
  locale: string
): Promise<{ tree: AdminNavNode[]; landingPath: string } | null> {
  const res = await backendFetch("/auth/nav", { accessToken, locale });
  if (!res.ok) return null;
  const body = (await res.json()) as ApiNavResponse;
  return {
    tree: apiNavTreeToAdminNodes(body.tree ?? []),
    landingPath: body.landing_path ?? "",
  };
}

export { parseApiError };
