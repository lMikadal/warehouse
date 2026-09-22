import { handlePickingFamilyGet } from "@/lib/bff-order-picking-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePickingFamilyGet(request, id);
}
