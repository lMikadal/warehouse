import { handlePickingShippingPatch } from "@/lib/bff-order-picking-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePickingShippingPatch(request, id);
}
