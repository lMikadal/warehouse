import { handleSalesClaimItemsGet } from "@/lib/bff-order-sales-claim-handlers";

export async function GET(request: Request) {
  return handleSalesClaimItemsGet(request);
}
