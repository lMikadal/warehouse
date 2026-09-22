import { handlePickingFiltersGet } from "@/lib/bff-order-picking-handlers";

export async function GET(request: Request) {
  return handlePickingFiltersGet(request);
}
