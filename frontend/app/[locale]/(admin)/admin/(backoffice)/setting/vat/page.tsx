import { routing } from "@/i18n/routing";

import { SettingVatList } from "../_shared/setting-vat-list";

export default function SettingVatPage() {
  return <SettingVatList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
