import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function SystemAddressDistrictLoading() {
  return (
    <CrudListPageSkeleton
      tableColumns={5}
      showDragColumn
      toolbarFilterSlots={2}
    />
  );
}
