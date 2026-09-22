import { PickingPaymentPage } from "../../_shared/picking-payment-page";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flow?: string; mode?: string; paymentId?: string; extraPay?: string }>;
};

export default async function PickingPaymentRoute({ params, searchParams }: Props) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const orderId = Number.parseInt(id, 10);
  const paymentId = Number.parseInt(q.paymentId ?? "", 10);

  return (
    <PickingPaymentPage
      orderId={Number.isFinite(orderId) ? orderId : 0}
      flow={q.flow === "credit" ? "credit" : "payment"}
      mode={q.mode === "view" ? "view" : undefined}
      paymentId={Number.isFinite(paymentId) ? paymentId : undefined}
      extraPay={q.extraPay === "1"}
    />
  );
}
