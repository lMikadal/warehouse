import { handleSystemPermissionPatch } from "@/lib/bff-system-permission-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSystemPermissionPatch(request, id);
}
