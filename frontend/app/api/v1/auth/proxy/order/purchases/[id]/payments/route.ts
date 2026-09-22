import {
  handlePurchasePaymentCreate,
  handlePurchasePaymentsGet,
} from "@/lib/bff-order-purchase-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchasePaymentsGet(request, id);
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePurchasePaymentCreate(request, id);
}
