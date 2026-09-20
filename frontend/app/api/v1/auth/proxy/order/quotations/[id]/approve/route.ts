import { handleQuotationApprove } from "@/lib/bff-order-quotation-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleQuotationApprove(request, id);
}
