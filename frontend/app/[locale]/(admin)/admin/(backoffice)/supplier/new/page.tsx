import { routing } from "@/i18n/routing";

import { SupplierUserForm } from "../_shared/supplier-user-form";

export default function SupplierUserCreatePage() {
  return <SupplierUserForm />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
