import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

import { GEO_SUB_DISTRICT_CONFIG } from "../_shared/system-geo-config";
import { systemGeoListSkeletonProps } from "../_shared/system-geo-skeleton";

export default function SystemAddressSubDistrictLoading() {
  return (
    <CrudListPageSkeleton
      {...systemGeoListSkeletonProps(GEO_SUB_DISTRICT_CONFIG)}
    />
  );
}
