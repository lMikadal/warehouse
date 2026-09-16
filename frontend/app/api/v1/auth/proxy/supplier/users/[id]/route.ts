import {
  handleSupplierUserDelete,
  handleSupplierUserGet,
  handleSupplierUserPatch,
} from "@/lib/bff-supplier-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSupplierUserGet(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSupplierUserPatch(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSupplierUserDelete(request, id);
}
