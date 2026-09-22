import { handleReceiveItem } from "@/lib/bff-order-receive-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleReceiveItem(request, id, itemId);
}
