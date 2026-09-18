import { routing } from "@/i18n/routing";

import { MemberSettingLangList } from "../../_shared/member-setting-lang-list";
import { MEMBER_SETTING_CREDIT_CONFIG } from "../../_shared/member-setting-config";

export default function MemberSettingCreditPage() {
  return <MemberSettingLangList config={MEMBER_SETTING_CREDIT_CONFIG} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
