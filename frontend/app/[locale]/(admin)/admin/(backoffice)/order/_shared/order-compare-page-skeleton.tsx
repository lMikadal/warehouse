import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export function OrderComparePageSkeleton() {
  return (
    <CrudListPageSkeleton tableColumns={3} tableRows={10} />
  );
}
