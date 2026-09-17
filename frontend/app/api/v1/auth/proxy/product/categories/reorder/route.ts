import { handleProductAttrReorder } from "@/lib/bff-product-handlers";

export async function PATCH(request: Request) {
  return handleProductAttrReorder(request, "categories");
}
