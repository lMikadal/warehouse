import { handleStoreSalesMemberGet } from "@/lib/bff-order-store-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleStoreSalesMemberGet(request, id);
}
