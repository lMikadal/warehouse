import { handleProductListsCreate } from "@/lib/bff-product-list-handlers";

export async function POST(request: Request) {
  return handleProductListsCreate(request);
}
