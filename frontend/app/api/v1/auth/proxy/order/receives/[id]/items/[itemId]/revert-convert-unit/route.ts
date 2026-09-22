import { handleReceiveItemRevertConvertUnit } from "@/lib/bff-order-receive-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleReceiveItemRevertConvertUnit(request, id, itemId);
}
