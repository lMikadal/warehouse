import { handleTicketItemRejectCreate } from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleTicketItemRejectCreate(request, id, itemId);
}
