import { PurchasePaymentPage } from "../../_shared/purchase-payment-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchasePaymentRoute({ params }: Props) {
  const { id } = await params;
  return <PurchasePaymentPage purchaseId={Number(id)} />;
}
