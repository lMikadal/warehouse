import { routing } from "@/i18n/routing";

import { LocationLangList } from "../_shared/location-lang-list";

export default function LocationLocationsPage() {
  return <LocationLangList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
