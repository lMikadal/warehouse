import { handleQuotationMemberGet } from "@/lib/bff-order-quotation-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleQuotationMemberGet(request, id);
}
