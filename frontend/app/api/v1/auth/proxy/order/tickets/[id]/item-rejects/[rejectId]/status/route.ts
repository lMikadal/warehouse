import { handleTicketItemRejectStatusPatch } from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string; rejectId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id, rejectId } = await ctx.params;
  return handleTicketItemRejectStatusPatch(request, id, rejectId);
}
