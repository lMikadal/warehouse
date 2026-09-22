import { handlePickingVatGet } from "@/lib/bff-order-picking-handlers";

export async function GET(request: Request) {
  return handlePickingVatGet(request);
}
