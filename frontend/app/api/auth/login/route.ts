import { NextResponse } from "next/server";

import { backendFetch, parseApiError } from "@/lib/api-server";
import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
  type LoginResponse,
} from "@/lib/auth-cookies";
import { authCookieOptions, landingCookieOptions } from "@/lib/auth-server";

type TokenPair = LoginResponse & {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const locale =
    request.headers.get("accept-language")?.split(",")[0]?.slice(0, 2) ?? "th";

  const res = await backendFetch("/auth/login", {
    method: "POST",
    body: {
      username: body.username ?? "",
      password: body.password ?? "",
    },
    locale,
  });

  if (!res.ok) {
    const err = await parseApiError(res);
    return NextResponse.json(
      { code: err.code ?? "login_failed", message: err.message },
      { status: res.status }
    );
  }

  const pair = (await res.json()) as TokenPair;
  const response = NextResponse.json({
    landing_path: pair.landing_path,
    user: pair.user,
  } satisfies LoginResponse);

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
