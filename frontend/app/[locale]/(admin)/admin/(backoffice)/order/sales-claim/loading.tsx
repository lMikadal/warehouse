import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function SalesClaimListLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={6}
      toolbarFilterSlots={1}
      showStatusFilter
    />
  );
}
