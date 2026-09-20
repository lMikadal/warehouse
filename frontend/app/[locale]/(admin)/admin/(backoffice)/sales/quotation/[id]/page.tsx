import { QuotationDetailPage } from "../_shared/quotation-detail-page";

type Props = { params: Promise<{ id: string }> };

export default async function QuotationDetailRoute({ params }: Props) {
  const { id } = await params;
  return <QuotationDetailPage id={Number(id)} />;
}
