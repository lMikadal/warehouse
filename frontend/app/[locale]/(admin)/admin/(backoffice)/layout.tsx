import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { AdminBackofficeShell } from "@/components/organisms/admin-backoffice-shell";
import { AdminBackofficeActorProvider } from "@/lib/admin-backoffice-actor-context";
import { mergeLocationNavNodes } from "@/lib/admin-nav-api";
import { SSR_REFRESH_TRIED_COOKIE } from "@/lib/auth-cookies";
import {
  fetchAuthMe,
  fetchAuthNav,
  fetchAuthPermissions,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth-server";
import { fetchActiveLocationsForNavServer } from "@/lib/location-api-server";

const LOCATION_VIEW_PERM = "location.location_location.view";

type Props = {
  children: ReactNode;
};

function refreshRedirectUrl(returnPath: string): string {
  return `/api/v1/auth/refresh-redirect?return=${encodeURIComponent(returnPath)}`;
}

function clearSessionLoginUrl(): string {
  return `/api/v1/auth/clear-session?return=${encodeURIComponent("/admin/login")}`;
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
    nextRedirect(clearSessionLoginUrl());
    return null;
  }

  const [user, nav, permissionCodes] = await Promise.all([
    fetchAuthMe(token, locale),
    fetchAuthNav(token, locale),
    fetchAuthPermissions(token, locale),
  ]);

  if (!user || !nav) {
    const jar = await cookies();
    const ssrRefreshTried =
      jar.get(SSR_REFRESH_TRIED_COOKIE)?.value === "1";
    const hasRefresh = Boolean(await getRefreshToken());
    if (hasRefresh && !ssrRefreshTried) {
      nextRedirect(refreshRedirectUrl(returnPath));
    }
    nextRedirect(clearSessionLoginUrl());
    return null;
  }

  const { tree: baseTree } = nav;
  const { username } = user;

  let tree = baseTree;
  if (permissionCodes.includes(LOCATION_VIEW_PERM)) {
    const locations = await fetchActiveLocationsForNavServer(token, locale);
    tree = mergeLocationNavNodes(baseTree, locations);
  }

  return (
    <AdminBackofficeActorProvider user={user} permissionCodes={permissionCodes}>
      <AdminBackofficeShell navTree={tree} user={{ username }}>
        {children}
      </AdminBackofficeShell>
    </AdminBackofficeActorProvider>
  );
}
