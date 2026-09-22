import { ReceiveDetailPage } from "../../_shared/receive-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function ReceiveDetailRoute({ params }: Props) {
  const { id } = await params;
  return <ReceiveDetailPage purchaseId={Number(id)} />;
}
