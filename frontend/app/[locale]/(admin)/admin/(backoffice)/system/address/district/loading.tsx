import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

import { GEO_DISTRICT_CONFIG } from "../_shared/system-geo-config";
import { systemGeoListSkeletonProps } from "../_shared/system-geo-skeleton";

export default function SystemAddressDistrictLoading() {
  return (
    <CrudListPageSkeleton {...systemGeoListSkeletonProps(GEO_DISTRICT_CONFIG)} />
  );
}
