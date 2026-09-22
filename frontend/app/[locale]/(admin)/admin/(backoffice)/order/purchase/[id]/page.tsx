import { PurchaseByIdPage } from "../_shared/purchase-by-id-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseEditPage({ params }: Props) {
  const { id } = await params;
  const purchaseId = Number(id);
  return (
    <PurchaseByIdPage
      purchaseId={Number.isFinite(purchaseId) ? purchaseId : 0}
    />
  );
}
