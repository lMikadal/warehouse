import { handleTicketItemStatusPatch } from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleTicketItemStatusPatch(request, id, itemId);
}
