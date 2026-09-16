import { routing } from "@/i18n/routing";

import { SupplierUserForm } from "../_shared/supplier-user-form";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function SupplierUserEditPage({ params }: PageProps) {
  const { id } = await params;
  const supplierId = Number(id);
  return <SupplierUserForm supplierId={supplierId} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
