import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function PickingListLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={9}
      toolbarFilterSlots={2}
      showStatusFilter
    />
  );
}
