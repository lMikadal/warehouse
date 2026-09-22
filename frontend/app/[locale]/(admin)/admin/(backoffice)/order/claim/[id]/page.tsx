import { ClaimEditPage } from "../_shared/claim-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function OrderClaimEditRoute({ params }: Props) {
  const { id } = await params;
  return <ClaimEditPage claimId={Number(id)} />;
}
