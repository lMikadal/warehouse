import {
  handleSupplierContactDelete,
  handleSupplierContactPatch,
} from "@/lib/bff-supplier-handlers";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id, contactId } = await context.params;
  return handleSupplierContactPatch(request, id, contactId);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, contactId } = await context.params;
  return handleSupplierContactDelete(request, id, contactId);
}
