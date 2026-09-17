import { handleWarehouseStats } from "@/lib/bff-warehouse-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleWarehouseStats(request, id);
}
