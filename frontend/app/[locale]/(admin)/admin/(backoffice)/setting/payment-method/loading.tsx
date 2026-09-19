import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

import { SETTING_PAYMENT_CONFIG } from "../_shared/setting-config";
import { settingLangListSkeletonProps } from "../_shared/setting-list-skeleton";

export default function Loading() {
  return (
    <CrudListPageSkeleton {...settingLangListSkeletonProps(SETTING_PAYMENT_CONFIG)} />
  );
}
