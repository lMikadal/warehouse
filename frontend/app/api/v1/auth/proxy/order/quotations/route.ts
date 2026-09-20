import {
  handleQuotationCreate,
  handleQuotationListGet,
} from "@/lib/bff-order-quotation-handlers";

export async function GET(request: Request) {
  return handleQuotationListGet(request);
}

export async function POST(request: Request) {
  return handleQuotationCreate(request);
}
