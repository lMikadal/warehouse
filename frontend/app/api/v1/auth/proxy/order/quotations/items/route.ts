import { handleQuotationItemsGet } from "@/lib/bff-order-quotation-handlers";

export async function GET(request: Request) {
  return handleQuotationItemsGet(request);
}
