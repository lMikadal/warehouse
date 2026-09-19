import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

import { GEO_COUNTRY_CONFIG } from "../_shared/system-geo-config";
import { systemGeoListSkeletonProps } from "../_shared/system-geo-skeleton";

export default function Loading() {
  return <CrudListPageSkeleton {...systemGeoListSkeletonProps(GEO_COUNTRY_CONFIG)} />;
}
