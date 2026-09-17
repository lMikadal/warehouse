import { handleWarehouseReorder } from "@/lib/bff-warehouse-handlers";

export async function PATCH(request: Request) {
  return handleWarehouseReorder(request);
}
