import { handleReceivePlacementsGet } from "@/lib/bff-order-receive-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleReceivePlacementsGet(request, id, itemId);
}
