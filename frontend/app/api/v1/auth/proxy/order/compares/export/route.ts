import { handleOrderCompareExportGet } from "@/lib/bff-order-compare-handlers";

export async function GET(request: Request) {
  return handleOrderCompareExportGet(request);
}
