import {
  handleTicketItemDelete,
  handleTicketItemPut,
} from "@/lib/bff-order-ticket-handlers";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleTicketItemPut(request, id, itemId);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  return handleTicketItemDelete(request, id, itemId);
}
