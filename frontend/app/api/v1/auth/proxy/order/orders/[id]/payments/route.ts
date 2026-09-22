import {
  handlePickingPaymentCreate,
  handlePickingPaymentsGet,
} from "@/lib/bff-order-picking-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePickingPaymentsGet(request, id);
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlePickingPaymentCreate(request, id);
}
