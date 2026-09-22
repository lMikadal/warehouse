import { PickingFormPage } from "../_shared/picking-form-page";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function PickingEditPage({ params, searchParams }: Props) {
  const [{ id }, { mode }] = await Promise.all([params, searchParams]);
  const orderId = Number.parseInt(id, 10);
  return (
    <PickingFormPage
      orderId={Number.isFinite(orderId) ? orderId : 0}
      mode={mode === "view" || mode === "extraPay" ? mode : undefined}
    />
  );
}
