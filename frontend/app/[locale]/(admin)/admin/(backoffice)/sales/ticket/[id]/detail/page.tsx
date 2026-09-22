import { TicketDetailPage } from "../../_shared/ticket-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function TicketDetailRoute({ params }: Props) {
  const { id } = await params;
  return <TicketDetailPage ticketId={Number(id)} />;
}
