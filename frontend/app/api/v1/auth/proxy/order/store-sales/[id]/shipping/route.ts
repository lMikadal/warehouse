import { handleStoreSalesShippingPatch } from "@/lib/bff-order-store-handlers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return handleStoreSalesShippingPatch(request, id);
}
