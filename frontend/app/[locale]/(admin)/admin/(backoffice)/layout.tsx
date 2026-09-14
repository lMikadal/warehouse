import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";

import { AdminBackofficeShell } from "@/components/organisms/admin-backoffice-shell";
import { redirect } from "@/i18n/navigation";
import {
  fetchAuthMe,
  fetchAuthNav,
  getAccessToken,
} from "@/lib/auth-server";

type Props = {
  children: ReactNode;
};

export default async function BackofficeLayout({ children }: Props) {
  const locale = await getLocale();
  const access = await getAccessToken();
  if (!access) {
    redirect({ href: "/admin/login", locale });
  }

  const token = access as string;
  const [user, nav] = await Promise.all([
    fetchAuthMe(token, locale),
    fetchAuthNav(token, locale),
  ]);

  if (!user || !nav) {
    redirect({ href: "/admin/login", locale });
    return null;
  }

  const { tree } = nav;
  const { username } = user;

  return (
    <AdminBackofficeShell navTree={tree} user={{ username }}>
      {children}
    </AdminBackofficeShell>
  );
}
