import { handlePickingPaymentPatch } from "@/lib/bff-order-picking-handlers";

type Ctx = { params: Promise<{ id: string; paymentId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, paymentId } = await ctx.params;
  return handlePickingPaymentPatch(request, id, paymentId);
}
