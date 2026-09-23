import { TicketDetailPage } from "../../../../../sales/ticket/_shared/ticket-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseTicketDetailPage({ params }: Props) {
  const { id } = await params;
  return <TicketDetailPage ticketId={Number(id)} showLinkedPurchases />;
}
