import { PurchaseFormPage } from "../_shared/purchase-form-page";

type Props = { params: Promise<{ id: string }> };

export default async function PurchaseEditPage({ params }: Props) {
  const { id } = await params;
  const editId = Number(id);
  return (
    <PurchaseFormPage editId={Number.isFinite(editId) ? editId : undefined} />
  );
}
