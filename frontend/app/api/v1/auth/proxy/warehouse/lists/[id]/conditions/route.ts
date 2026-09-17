import { handleWarehouseConditionsPatch } from "@/lib/bff-warehouse-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleWarehouseConditionsPatch(request, id);
}
