import { ClaimDetailPage } from "../../_shared/claim-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function OrderClaimDetailRoute({ params }: Props) {
  const { id } = await params;
  return <ClaimDetailPage claimId={Number(id)} />;
}
