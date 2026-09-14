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
import type { AdminNavNode } from "@/lib/admin-nav-api";

export type AuthTokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  landing_path?: string;
};

let refreshInFlight: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(REFRESH_TOKEN_COOKIE)?.value;
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

export async function applyTokenPairToCookies(pair: AuthTokenPair) {
  const jar = await cookies();
  const accessMax = Math.max(pair.expires_in, 60);
  jar.set(
    ACCESS_TOKEN_COOKIE,
    pair.access_token,
    authCookieOptions(accessMax)
  );
  jar.set(
    REFRESH_TOKEN_COOKIE,
    pair.refresh_token,
    authCookieOptions(60 * 60 * 24 * 7)
  );
  if (pair.landing_path) {
    jar.set(
      LANDING_PATH_COOKIE,
      pair.landing_path,
      landingCookieOptions(60 * 60 * 24 * 7)
    );
  }
}

async function refreshAccessTokenFromCookiesOnce(): Promise<string | null> {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) {
    return null;
  }

  const res = await backendFetch("/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refresh },
  });

  if (!res.ok) {
    await clearAuthCookies();
    return null;
  }

  const pair = (await res.json()) as AuthTokenPair;
  await applyTokenPairToCookies(pair);
  return pair.access_token;
}

/** Deduped — Go rotates refresh tokens on each call. */
export async function refreshAccessTokenFromCookies(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = refreshAccessTokenFromCookiesOnce().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function getValidAccessToken(): Promise<string | null> {
  const access = await getAccessToken();
  if (access) {
    return access;
  }
  return refreshAccessTokenFromCookies();
}

export async function fetchAuthMe(
  accessToken: string,
  locale: string
): Promise<AuthUser | null> {
  const res = await backendFetch("/v1/auth/me", { accessToken, locale });
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

export async function fetchAuthNav(
  accessToken: string,
  locale: string
): Promise<{ tree: AdminNavNode[]; landingPath: string } | null> {
  const res = await backendFetch("/v1/auth/nav", { accessToken, locale });
  if (!res.ok) return null;
  const body = (await res.json()) as ApiNavResponse;
  return {
    tree: apiNavTreeToAdminNodes(body.tree ?? []),
    landingPath: body.landing_path ?? "",
  };
}

export { parseApiError };
