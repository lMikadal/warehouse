import { handleClaimGet, handleClaimPut } from "@/lib/bff-order-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleClaimGet(request, id);
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleClaimPut(request, id);
}
