import { handleQuotationFiltersGet } from "@/lib/bff-order-quotation-handlers";

export async function GET(request: Request) {
  return handleQuotationFiltersGet(request);
}
