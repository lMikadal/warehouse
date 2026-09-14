import { routing } from "@/i18n/routing";

import { SystemLanguageList } from "./system-language-list";

export default function SystemLanguagePage() {
  return <SystemLanguageList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
