import { handleSalesClaimItemPatch } from "@/lib/bff-order-sales-claim-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleSalesClaimItemPatch(request, id, itemId);
}
