import { routing } from "@/i18n/routing";

import { WarehouseManagementView } from "../../_shared/warehouse-management-view";

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { id } = await searchParams;
  return <WarehouseManagementView warehouseId={id ? Number(id) : null} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
