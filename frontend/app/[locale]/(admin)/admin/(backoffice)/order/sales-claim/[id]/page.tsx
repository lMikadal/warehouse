import { SalesClaimDetailPage } from "../_shared/sales-claim-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function OrderSalesClaimProcessRoute({ params }: Props) {
  const { id } = await params;
  return <SalesClaimDetailPage claimId={Number(id)} />;
}
