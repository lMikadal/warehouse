import { handlePurchasePaymentDelete } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string; paymentId: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  const { id, paymentId } = await ctx.params;
  return handlePurchasePaymentDelete(request, id, paymentId);
}
