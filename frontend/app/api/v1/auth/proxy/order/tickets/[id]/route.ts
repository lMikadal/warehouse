import {
  handleTicketDelete,
  handleTicketGet,
  handleTicketPut,
} from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleTicketGet(request, id);
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleTicketPut(request, id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleTicketDelete(request, id);
}
