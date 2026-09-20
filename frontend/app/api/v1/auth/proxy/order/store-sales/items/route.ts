import { handleStoreSalesItemsGet } from "@/lib/bff-order-store-handlers";

export async function GET(request: Request) {
  return handleStoreSalesItemsGet(request);
}
