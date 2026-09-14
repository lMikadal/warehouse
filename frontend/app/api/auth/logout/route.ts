import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/api-server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { clearAuthCookies } from "@/lib/auth-server";

export async function POST() {
  const jar = await cookies();
  const access = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  const refresh = jar.get(REFRESH_TOKEN_COOKIE)?.value;

  if (access || refresh) {
    await backendFetch("/auth/logout", {
      method: "POST",
      body: { refresh_token: refresh ?? "" },
      accessToken: access,
    });
  }

  await clearAuthCookies();
  return new NextResponse(null, { status: 204 });
}
