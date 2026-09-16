import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function AdminBackofficeLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={6}
      showDragColumn
      toolbarFilterSlots={0}
    />
  );
}
