import { routing } from "@/i18n/routing";

import { WarehouseManagementView } from "../../_shared/warehouse-management-view";

type Props = {
  searchParams: Promise<{ id?: string; zone?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { id, zone } = await searchParams;
  const expandZoneId = zone ? Number(zone) : null;
  return (
    <WarehouseManagementView
      warehouseId={id ? Number(id) : null}
      expandZoneId={
        expandZoneId != null && !Number.isNaN(expandZoneId)
          ? expandZoneId
          : null
      }
    />
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
