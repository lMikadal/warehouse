import { routing } from "@/i18n/routing";

import { MemberTierPage } from "../_shared/member-tier-page";

export default function MemberTiersPage() {
  return <MemberTierPage />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
