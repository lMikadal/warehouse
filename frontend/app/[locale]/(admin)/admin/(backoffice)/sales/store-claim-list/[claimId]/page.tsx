import { StoreClaimDocumentPage } from "../_shared/store-claim-document-page";

type Props = { params: Promise<{ claimId: string }> };

export default async function StoreClaimDocumentRoute({ params }: Props) {
  const { claimId } = await params;
  return <StoreClaimDocumentPage claimId={Number(claimId)} />;
}
