import { routing } from "@/i18n/routing";

import { SettingCodeList } from "../_shared/setting-code-list";

export default function SettingCodePage() {
  return <SettingCodeList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
