import { routing } from "@/i18n/routing";

import { SupplierUserList } from "./_shared/supplier-user-list";

export default function SupplierUsersPage() {
  return <SupplierUserList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
