import type { SystemFilePurpose } from "@/lib/system-file-api";
import type { SettingLangSegment } from "@/lib/setting-api";

export type SettingLangListConfig = {
  segment: SettingLangSegment;
  permType: string;
  logoPurpose?: SystemFilePurpose;
  pageKey:
    | "settingBank"
    | "settingPaymentMethod"
    | "settingSaleChannel"
    | "settingClaimReason"
    | "settingPrefix";
  paymentFilters?: boolean;
  claimFlags?: boolean;
  saleDefault?: boolean;
  prefixFlags?: boolean;
  showCodeColumn?: boolean;
};

export const SETTING_BANK_CONFIG: SettingLangListConfig = {
  segment: "banks",
  permType: "setting_bank",
  pageKey: "settingBank",
  logoPurpose: "setting_bank_logo",
};

export const SETTING_PAYMENT_CONFIG: SettingLangListConfig = {
  segment: "payment-methods",
  permType: "setting_payment_method",
  pageKey: "settingPaymentMethod",
  paymentFilters: true,
};

export const SETTING_SALE_CONFIG: SettingLangListConfig = {
  segment: "sale-channels",
  permType: "setting_sale_channel",
  pageKey: "settingSaleChannel",
  saleDefault: true,
  logoPurpose: "setting_sale_channel_logo",
};

export const SETTING_CLAIM_CONFIG: SettingLangListConfig = {
  segment: "claim-reasons",
  permType: "setting_claim_reason",
  pageKey: "settingClaimReason",
  claimFlags: true,
};

export const SETTING_PREFIX_CONFIG: SettingLangListConfig = {
  segment: "prefixes",
  permType: "setting_prefix",
  pageKey: "settingPrefix",
  prefixFlags: true,
};
