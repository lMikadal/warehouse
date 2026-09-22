import {
  handleSalesClaimDelete,
  handleSalesClaimGet,
  handleSalesClaimPatch,
} from "@/lib/bff-order-sales-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleSalesClaimGet(request, id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleSalesClaimPatch(request, id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleSalesClaimDelete(request, id);
}
