import { handlePurchaseItemConvertUnit } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handlePurchaseItemConvertUnit(request, id, itemId);
}
