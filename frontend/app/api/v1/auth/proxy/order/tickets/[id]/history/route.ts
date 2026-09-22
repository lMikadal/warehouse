import { handleTicketHistoryGet } from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleTicketHistoryGet(request, id);
}
