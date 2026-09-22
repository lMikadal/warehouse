import {
  handlePurchaseDelete,
  handlePurchaseGet,
  handlePurchasePut,
} from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchaseGet(request, id);
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchasePut(request, id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchaseDelete(request, id);
}
