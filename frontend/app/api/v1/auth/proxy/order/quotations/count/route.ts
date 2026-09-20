import { handleQuotationCountGet } from "@/lib/bff-order-quotation-handlers";

export async function GET(request: Request) {
  return handleQuotationCountGet(request);
}
