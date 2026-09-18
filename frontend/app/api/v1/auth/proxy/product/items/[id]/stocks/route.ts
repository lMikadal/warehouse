import {
  handleProductItemStockCreate,
  handleProductItemStocks,
} from "@/lib/bff-product-list-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductItemStocks(request, id);
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleProductItemStockCreate(request, id);
}
