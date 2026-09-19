import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function Loading() {
  return (
    <CrudListPageSkeleton
      tableColumns={6}
      showDragColumn
      showHeaderAction={false}
    />
  );
}
