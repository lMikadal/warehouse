import { handleTicketItemCreate } from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleTicketItemCreate(request, id);
}
