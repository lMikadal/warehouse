import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { AdminBackofficeShell } from "@/components/organisms/admin-backoffice-shell";
import { redirect } from "@/i18n/navigation";
import { SSR_REFRESH_TRIED_COOKIE } from "@/lib/auth-cookies";
import {
  fetchAuthMe,
  fetchAuthNav,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth-server";

type Props = {
  children: ReactNode;
};

function refreshRedirectUrl(returnPath: string): string {
  return `/api/v1/auth/refresh-redirect?return=${encodeURIComponent(returnPath)}`;
}

export default async function BackofficeLayout({ children }: Props) {
  const locale = await getLocale();
  const headerStore = await headers();
  const returnPath =
    headerStore.get("x-warehouse-admin-path") || "/admin/system/menu";

  const token = await getAccessToken();
  if (!token) {
    if (await getRefreshToken()) {
      nextRedirect(refreshRedirectUrl(returnPath));
    }
    redirect({ href: "/admin/login", locale });
  }

  const user = await fetchAuthMe(token, locale);
  const nav = await fetchAuthNav(token, locale);

  if (!user || !nav) {
    const jar = await cookies();
    const ssrRefreshTried =
      jar.get(SSR_REFRESH_TRIED_COOKIE)?.value === "1";
    if ((await getRefreshToken()) && !ssrRefreshTried) {
      nextRedirect(refreshRedirectUrl(returnPath));
    }
    redirect({ href: "/admin/login", locale });
  }

  const { tree } = nav;
  const { username } = user;

  return (
    <AdminBackofficeShell navTree={tree} user={{ username }}>
      {children}
    </AdminBackofficeShell>
  );
}
