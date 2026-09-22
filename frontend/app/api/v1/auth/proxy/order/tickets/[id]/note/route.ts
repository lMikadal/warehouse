import { handleTicketNotePatch } from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleTicketNotePatch(request, id);
}
