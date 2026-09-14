import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  LANDING_PATH_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { refreshAccessTokenFromCookies } from "@/lib/auth-server";

export async function POST() {
  const access = await refreshAccessTokenFromCookies();
  if (!access) {
    const response = NextResponse.json(
      { code: "unauthorized" },
      { status: 401 }
    );
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    response.cookies.delete(LANDING_PATH_COOKIE);
    return response;
  }
  return NextResponse.json({ ok: true });
}
