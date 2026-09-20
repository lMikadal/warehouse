import {
  handleQuotationDelete,
  handleQuotationGet,
  handleQuotationPatch,
} from "@/lib/bff-order-quotation-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleQuotationGet(_request, id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleQuotationPatch(request, id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleQuotationDelete(request, id);
}
