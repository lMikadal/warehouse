import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function StoreSalesLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={9}
      toolbarFilterSlots={2}
      showStatusFilter
    />
  );
}
