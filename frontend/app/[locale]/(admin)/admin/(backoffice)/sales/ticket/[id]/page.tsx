import { TicketFormPage } from "../_shared/ticket-form-page";

type Props = { params: Promise<{ id: string }> };

export default async function TicketEditPage({ params }: Props) {
  const { id } = await params;
  const editId = Number(id);
  return <TicketFormPage editId={Number.isFinite(editId) ? editId : undefined} />;
}
