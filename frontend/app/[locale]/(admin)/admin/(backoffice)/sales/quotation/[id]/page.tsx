import { QuotationIdPage } from "../_shared/quotation-id-page";

type Props = { params: Promise<{ id: string }> };

export default async function QuotationDetailRoute({ params }: Props) {
  const { id } = await params;
  return <QuotationIdPage id={Number(id)} />;
}
