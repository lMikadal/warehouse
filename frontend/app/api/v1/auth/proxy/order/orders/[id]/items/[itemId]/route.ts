import { handlePickingItemPatch } from "@/lib/bff-order-picking-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handlePickingItemPatch(request, id, itemId);
}
