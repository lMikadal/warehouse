import { routing } from "@/i18n/routing";

import { SystemPermissionList } from "./system-permission-list";

export default function SystemPermissionPage() {
  return <SystemPermissionList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
