import { routing } from "@/i18n/routing";

import { SettingLangList } from "../_shared/setting-lang-list";
import { SETTING_BANK_CONFIG } from "../_shared/setting-config";

export default function SettingPage() {
  return <SettingLangList config={SETTING_BANK_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
