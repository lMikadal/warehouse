import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function Loading() {
  return <CrudListPageSkeleton tableColumns={8} toolbarFilterSlots={2} />;
}
