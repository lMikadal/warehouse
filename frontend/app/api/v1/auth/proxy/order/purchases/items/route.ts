import { handlePurchaseItemsGet } from "@/lib/bff-order-purchase-handlers";

export async function GET(request: Request) {
  return handlePurchaseItemsGet(request);
}
