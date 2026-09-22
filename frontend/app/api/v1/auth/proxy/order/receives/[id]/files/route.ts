import { handleReceiveFilesPut } from "@/lib/bff-order-receive-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleReceiveFilesPut(request, id);
}
