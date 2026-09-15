import { routing } from "@/i18n/routing";

import { AdminRoleList } from "./admin-role-list";

export default function AdminRolesPage() {
  return <AdminRoleList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
