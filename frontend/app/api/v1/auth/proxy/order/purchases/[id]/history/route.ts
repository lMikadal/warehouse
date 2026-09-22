import { handlePurchaseHistoryGet } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchaseHistoryGet(request, id);
}
