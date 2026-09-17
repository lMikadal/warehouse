import { handleProductItemsListGet } from "@/lib/bff-product-list-handlers";

export async function GET(request: Request) {
  return handleProductItemsListGet(request);
}
