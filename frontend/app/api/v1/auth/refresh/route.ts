import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendFetch, parseApiError } from "@/lib/api-server";
import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { authCookieOptions, landingCookieOptions } from "@/lib/auth-server";

type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  landing_path?: string;
};

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const res = await backendFetch("/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refresh },
  });

  if (!res.ok) {
    const err = await parseApiError(res);
    const response = NextResponse.json(err, { status: res.status });
    if (res.status === 401) {
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
      response.cookies.delete(LANDING_PATH_COOKIE);
    }
    return response;
  }

  const pair = (await res.json()) as TokenPair;
  const response = NextResponse.json({ ok: true });
  const accessMax = Math.max(pair.expires_in, 60);
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    pair.access_token,
    authCookieOptions(accessMax)
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    pair.refresh_token,
    authCookieOptions(60 * 60 * 24 * 7)
  );
  if (pair.landing_path) {
    response.cookies.set(
      LANDING_PATH_COOKIE,
      pair.landing_path,
      landingCookieOptions(60 * 60 * 24 * 7)
    );
  }
  return response;
}
