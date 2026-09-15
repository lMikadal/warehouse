import { routing } from "@/i18n/routing";

import { AdminUserList } from "./admin-user-list";

export default function AdminUsersPage() {
  return <AdminUserList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
