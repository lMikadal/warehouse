import { handlePurchaseFiltersGet } from "@/lib/bff-order-purchase-handlers";

export async function GET(request: Request) {
  return handlePurchaseFiltersGet(request);
}
