import { handleWarehouseMove } from "@/lib/bff-warehouse-handlers";

export async function PATCH(request: Request) {
  return handleWarehouseMove(request);
}
