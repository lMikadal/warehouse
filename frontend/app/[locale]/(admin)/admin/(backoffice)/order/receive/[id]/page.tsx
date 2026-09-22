import { ReceiveProceedPage } from "../_shared/receive-proceed-page";

type Props = { params: Promise<{ id: string }> };

export default async function ReceiveProceedRoute({ params }: Props) {
  const { id } = await params;
  return <ReceiveProceedPage purchaseId={Number(id)} />;
}
