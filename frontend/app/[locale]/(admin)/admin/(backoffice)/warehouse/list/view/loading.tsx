import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function Loading() {
  return <CrudListPageSkeleton tableColumns={1} toolbarFilterSlots={0} />;
}
