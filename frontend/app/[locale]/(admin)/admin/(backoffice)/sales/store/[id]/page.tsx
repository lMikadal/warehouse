import { StoreSalesFormPage } from "../_shared/store-sales-form-page";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StoreSalesEditPage({ params }: Props) {
  const { id } = await params;
  const orderId = Number.parseInt(id, 10);
  return <StoreSalesFormPage orderId={Number.isFinite(orderId) ? orderId : undefined} />;
}
