import { handleSalesClaimStatusPatch } from "@/lib/bff-order-sales-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleSalesClaimStatusPatch(request, id);
}
