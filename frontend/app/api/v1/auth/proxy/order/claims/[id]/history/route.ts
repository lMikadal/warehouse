import { handleClaimHistoryGet } from "@/lib/bff-order-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleClaimHistoryGet(request, id);
}
