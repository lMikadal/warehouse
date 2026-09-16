import { routing } from "@/i18n/routing";

import { SettingLangList } from "../_shared/setting-lang-list";
import { SETTING_PAYMENT_CONFIG } from "../_shared/setting-config";

export default function SettingPage() {
  return <SettingLangList config={SETTING_PAYMENT_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
