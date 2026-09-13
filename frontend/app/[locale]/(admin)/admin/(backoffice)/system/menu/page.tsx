import { routing } from "@/i18n/routing";

import { SystemMenuList } from "./system-menu-list";

export default function SystemMenuPage() {
  return <SystemMenuList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
