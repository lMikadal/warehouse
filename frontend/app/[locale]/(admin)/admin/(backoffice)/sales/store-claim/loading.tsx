import { CrudListPageSkeleton } from "@/components/molecules/crud-list-page-skeleton";

export default function StoreClaimPaymentListLoading() {
  return <CrudListPageSkeleton tableColumns={7} toolbarFilterSlots={2} />;
}
