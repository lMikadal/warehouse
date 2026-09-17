import { handleProductItemsFiltersGet } from "@/lib/bff-product-list-handlers";

export async function GET(request: Request) {
  return handleProductItemsFiltersGet(request);
}
