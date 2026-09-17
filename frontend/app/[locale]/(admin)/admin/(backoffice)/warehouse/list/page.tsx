import { routing } from "@/i18n/routing";

import { WarehouseListPage } from "../_shared/warehouse-list-page";

export default function Page() {
  return <WarehouseListPage />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
