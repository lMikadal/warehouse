import { handleReceiveHistoryGet } from "@/lib/bff-order-receive-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleReceiveHistoryGet(request, id);
}
