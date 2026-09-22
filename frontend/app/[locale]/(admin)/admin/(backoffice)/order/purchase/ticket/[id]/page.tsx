import { TicketFormPage } from "../../../../sales/ticket/_shared/ticket-form-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseTicketEditPage({ params }: Props) {
  const { id } = await params;
  const editId = Number(id);
  return <TicketFormPage editId={Number.isFinite(editId) ? editId : undefined} />;
}
