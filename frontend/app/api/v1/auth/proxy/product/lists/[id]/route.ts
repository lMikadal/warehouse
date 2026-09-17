import {
  handleProductListDelete,
  handleProductListGet,
  handleProductListPatch,
} from "@/lib/bff-product-list-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductListGet(request, id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductListPatch(request, id);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductListDelete(_request, id);
}
