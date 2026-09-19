import { routing } from "@/i18n/routing";

import { MemberUserList } from "../_shared/member-user-list";

export default function MemberUsersPage() {
  return <MemberUserList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
