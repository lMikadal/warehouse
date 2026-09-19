import { routing } from "@/i18n/routing";

import { MemberUserForm } from "../../_shared/member-user-form";

export default function MemberUserCreatePage() {
  return <MemberUserForm />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
