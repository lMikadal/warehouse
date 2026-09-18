import { routing } from "@/i18n/routing";

import { MemberSettingLangList } from "../../_shared/member-setting-lang-list";
import { MEMBER_SETTING_GROUP_CONFIG } from "../../_shared/member-setting-config";

export default function MemberSettingGroupPage() {
  return <MemberSettingLangList config={MEMBER_SETTING_GROUP_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
