import { routing } from "@/i18n/routing";

import { SystemGeoList } from "../_shared/system-geo-list";
import { GEO_SUB_DISTRICT_CONFIG } from "../_shared/system-geo-config";

export default function SystemAddressSubDistrictPage() {
  return <SystemGeoList config={GEO_SUB_DISTRICT_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
