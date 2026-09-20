import { QuotationPaymentPage } from "../../_shared/quotation-payment-page";

type Props = { params: Promise<{ id: string }> };

export default async function QuotationPaymentRoute({ params }: Props) {
  const { id } = await params;
  return <QuotationPaymentPage id={Number(id)} />;
}
