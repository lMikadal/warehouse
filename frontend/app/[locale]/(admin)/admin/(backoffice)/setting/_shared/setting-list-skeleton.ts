import type { CrudListPageSkeletonProps } from "@/components/molecules/crud-list-page-skeleton";

import type { SettingLangListConfig } from "./setting-config";

export function settingLangTableColumnCount(config: SettingLangListConfig): number {
  let n = 1;
  if (config.logoPurpose) n += 1;
  n += 1;
  if (config.showCodeColumn) n += 1;
  if (config.paymentFilters) n += 2;
  if (config.saleDefault) n += 1;
  if (config.claimFlags) n += 2;
  if (config.prefixFlags) n += 2;
  n += 3;
  return n;
}

export function settingLangListSkeletonProps(
  config: SettingLangListConfig
): Pick<
  CrudListPageSkeletonProps,
  "tableColumns" | "showDragColumn" | "toolbarFilterSlots"
> {
  return {
    tableColumns: settingLangTableColumnCount(config),
    showDragColumn: true,
    toolbarFilterSlots: 0,
  };
}
