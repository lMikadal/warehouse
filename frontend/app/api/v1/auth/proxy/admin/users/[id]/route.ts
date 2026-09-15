import {
  handleAdminUserDelete,
  handleAdminUserGet,
  handleAdminUserPatch,
} from "@/lib/bff-admin-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminUserGet(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminUserPatch(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminUserDelete(request, id);
}
