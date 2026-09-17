import {
  handleWarehouseDelete,
  handleWarehouseGet,
  handleWarehousePatch,
} from "@/lib/bff-warehouse-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleWarehouseGet(request, id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleWarehousePatch(request, id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleWarehouseDelete(request, id);
}
