import { PurchaseDetailPage } from "../../_shared/purchase-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseDetailRoute({ params }: Props) {
  const { id } = await params;
  return <PurchaseDetailPage purchaseId={Number(id)} />;
}
