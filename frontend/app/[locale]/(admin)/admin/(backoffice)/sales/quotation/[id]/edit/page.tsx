import { QuotationEditPage } from "../../_shared/quotation-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function QuotationEditRoute({ params }: Props) {
  const { id } = await params;
  return <QuotationEditPage id={Number(id)} />;
}
