import { handlePurchaseItemCreate } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchaseItemCreate(request, id);
}
