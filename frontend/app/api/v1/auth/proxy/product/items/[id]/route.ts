import {
  handleProductItemDelete,
  handleProductItemPatch,
} from "@/lib/bff-product-list-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductItemPatch(request, id);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductItemDelete(_request, id);
}
