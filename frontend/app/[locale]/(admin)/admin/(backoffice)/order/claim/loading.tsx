import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function ClaimListLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={6}
      toolbarFilterSlots={2}
      showStatusFilter
    />
  );
}
