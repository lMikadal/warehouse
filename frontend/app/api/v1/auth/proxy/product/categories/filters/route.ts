import { handleProductCategoryFiltersGet } from "@/lib/bff-product-handlers";

export async function GET(request: Request) {
  return handleProductCategoryFiltersGet(request);
}
