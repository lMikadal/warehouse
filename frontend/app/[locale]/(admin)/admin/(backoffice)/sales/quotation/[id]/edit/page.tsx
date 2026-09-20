import { QuotationFormPage } from "../../_shared/quotation-form-page";

type Props = { params: Promise<{ id: string }> };

export default async function QuotationEditRoute({ params }: Props) {
  const { id } = await params;
  return <QuotationFormPage editId={Number(id)} />;
}
