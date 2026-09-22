import { handlePurchaseItemStatusPatch } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handlePurchaseItemStatusPatch(request, id, itemId);
}
