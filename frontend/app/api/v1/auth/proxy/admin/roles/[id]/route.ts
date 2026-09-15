import {
  handleAdminRoleDelete,
  handleAdminRoleGet,
  handleAdminRolePatch,
} from "@/lib/bff-admin-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminRoleGet(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminRolePatch(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminRoleDelete(request, id);
}
