import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function StoreClaimListLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={8}
      toolbarFilterSlots={2}
      showStatusFilter
    />
  );
}
