import {
  handleStoreClaimClaimsGet,
  handleStoreClaimCreate,
} from "@/lib/bff-order-store-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleStoreClaimClaimsGet(request, id);
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleStoreClaimCreate(request, id);
}
