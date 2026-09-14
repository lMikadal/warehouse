import { handleSystemMenuPatch } from "@/lib/bff-system-menu-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSystemMenuPatch(request, id);
}
