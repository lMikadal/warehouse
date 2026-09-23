import { handleProductListHistoryPurchase } from "@/lib/bff-product-list-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductListHistoryPurchase(request, id);
}
