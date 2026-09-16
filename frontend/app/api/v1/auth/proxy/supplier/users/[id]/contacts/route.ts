import { handleSupplierContactCreate } from "@/lib/bff-supplier-handlers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleSupplierContactCreate(request, id);
}
