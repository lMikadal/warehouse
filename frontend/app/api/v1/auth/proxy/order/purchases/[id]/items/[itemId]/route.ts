import {
  handlePurchaseItemDelete,
  handlePurchaseItemPut,
} from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handlePurchaseItemPut(request, id, itemId);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handlePurchaseItemDelete(request, id, itemId);
}
