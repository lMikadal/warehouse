import { handlePurchaseStatusPatch } from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchaseStatusPatch(request, id);
}
