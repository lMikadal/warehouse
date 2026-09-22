import { handleStoreClaimDelete } from "@/lib/bff-order-store-claim-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleStoreClaimDelete(request, id);
}
