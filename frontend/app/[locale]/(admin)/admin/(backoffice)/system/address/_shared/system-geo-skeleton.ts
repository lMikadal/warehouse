import type { CrudListPageSkeletonProps } from "@/components/molecules/crud-list-page-skeleton";

import type { SystemGeoListConfig } from "./system-geo-config";

/** Matches `colSpan` in `system-geo-list.tsx`. */
export function systemGeoTableColumnCount(config: SystemGeoListConfig): number {
  return (
    5 +
    (config.parentColumnLabel ? 1 : 0) +
    (config.showPostcode ? 1 : 0)
  );
}

export function systemGeoListSkeletonProps(
  config: SystemGeoListConfig
): Pick<
  CrudListPageSkeletonProps,
  "tableColumns" | "showDragColumn" | "toolbarFilterSlots"
> {
  return {
    tableColumns: systemGeoTableColumnCount(config),
    showDragColumn: true,
    toolbarFilterSlots: config.filterLevels?.length ?? 0,
  };
}
