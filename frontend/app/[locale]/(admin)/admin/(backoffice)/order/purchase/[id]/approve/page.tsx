import { PurchaseApprovePage } from "../../_shared/purchase-approve-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseApproveRoute({ params }: Props) {
  const { id } = await params;
  return <PurchaseApprovePage purchaseId={Number(id)} />;
}
