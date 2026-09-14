import { routing } from "@/i18n/routing";

import { SystemGeoList } from "../_shared/system-geo-list";
import { GEO_PROVINCE_CONFIG } from "../_shared/system-geo-config";

export default function SystemAddressProvincePage() {
  return <SystemGeoList config={GEO_PROVINCE_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
