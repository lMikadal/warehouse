import {
  handleProductItemStockDelete,
  handleProductItemStockPatch,
} from "@/lib/bff-product-list-handlers";

type Ctx = { params: Promise<{ id: string; stockId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, stockId } = await ctx.params;
  return handleProductItemStockPatch(request, id, stockId);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id, stockId } = await ctx.params;
  return handleProductItemStockDelete(_request, id, stockId);
}
