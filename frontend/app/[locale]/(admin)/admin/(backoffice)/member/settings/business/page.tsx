import { routing } from "@/i18n/routing";

import { MemberSettingBusinessList } from "../../_shared/member-setting-business-list";

export default function MemberSettingBusinessPage() {
  return <MemberSettingBusinessList />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
