import type { MemberSettingSegment } from "@/lib/bff-member-setting-handlers";

export type MemberSettingLangListConfig = {
  segment: MemberSettingSegment;
  permType: string;
  pageKey: "memberSettingCredit" | "memberSettingGroup";
};

export const MEMBER_SETTING_CREDIT_CONFIG: MemberSettingLangListConfig = {
  segment: "credits",
  permType: "member_setting_credit",
  pageKey: "memberSettingCredit",
};

export const MEMBER_SETTING_GROUP_CONFIG: MemberSettingLangListConfig = {
  segment: "groups",
  permType: "member_setting_group",
  pageKey: "memberSettingGroup",
};
