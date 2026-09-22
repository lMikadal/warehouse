import { StoreClaimFormPage } from "../_shared/store-claim-form-page";

type Props = { params: Promise<{ paymentId: string }> };

export default async function StoreClaimFormRoute({ params }: Props) {
  const { paymentId } = await params;
  const id = Number.parseInt(paymentId, 10);
  return <StoreClaimFormPage paymentId={Number.isFinite(id) ? id : 0} />;
}
