import { handlePurchaseFilesPut } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchaseFilesPut(request, id);
}
