import {
  handleProductAttrDelete,
  handleProductAttrGet,
  handleProductAttrPatch,
} from "@/lib/bff-product-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductAttrGet(request, "cars", id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductAttrPatch(request, "cars", id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductAttrDelete(request, "cars", id);
}
