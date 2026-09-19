import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function SystemPermissionLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={5}
      showDragColumn={false}
      toolbarFilterSlots={2}
    />
  );
}
