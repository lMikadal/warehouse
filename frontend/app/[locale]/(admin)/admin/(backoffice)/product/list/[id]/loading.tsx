import { CrudTabbedFormPageSkeleton } from "@/components/molecules/crud-tabbed-form-page-skeleton";

export default function ProductListEditLoading() {
  return (
    <CrudTabbedFormPageSkeleton leftCardCount={3} pricingVariantStrips={2} />
  );
}
