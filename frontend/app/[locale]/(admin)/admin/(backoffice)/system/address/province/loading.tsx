import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

import { GEO_PROVINCE_CONFIG } from "../_shared/system-geo-config";
import { systemGeoListSkeletonProps } from "../_shared/system-geo-skeleton";

export default function SystemAddressProvinceLoading() {
  return (
    <CrudListPageSkeleton {...systemGeoListSkeletonProps(GEO_PROVINCE_CONFIG)} />
  );
}
