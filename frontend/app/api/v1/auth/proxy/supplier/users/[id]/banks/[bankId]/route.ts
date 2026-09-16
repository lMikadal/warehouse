import {
  handleSupplierBankDelete,
  handleSupplierBankPatch,
} from "@/lib/bff-supplier-handlers";

type RouteContext = { params: Promise<{ id: string; bankId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id, bankId } = await context.params;
  return handleSupplierBankPatch(request, id, bankId);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, bankId } = await context.params;
  return handleSupplierBankDelete(request, id, bankId);
}
