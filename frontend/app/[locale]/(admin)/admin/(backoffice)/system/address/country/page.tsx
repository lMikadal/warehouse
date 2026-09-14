import { routing } from "@/i18n/routing";

import { SystemGeoList } from "../_shared/system-geo-list";
import { GEO_COUNTRY_CONFIG } from "../_shared/system-geo-config";

export default function SystemAddressCountryPage() {
  return <SystemGeoList config={GEO_COUNTRY_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
