import { routing } from "@/i18n/routing";

import { SettingVatPanel } from "../_shared/setting-vat-panel";

export default function SettingVatPage() {
  return <SettingVatPanel />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
