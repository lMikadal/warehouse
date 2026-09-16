import { handleSupplierBankReorder } from "@/lib/bff-supplier-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSupplierBankReorder(request, id);
}
