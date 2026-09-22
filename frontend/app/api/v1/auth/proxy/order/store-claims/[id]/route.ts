import { handleStoreClaimPaymentGet } from "@/lib/bff-order-store-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleStoreClaimPaymentGet(request, id);
}
