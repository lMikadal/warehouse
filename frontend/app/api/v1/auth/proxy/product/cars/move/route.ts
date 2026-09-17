import { handleProductAttrMove } from "@/lib/bff-product-handlers";

export async function PATCH(request: Request) {
  return handleProductAttrMove(request, "cars");
}
