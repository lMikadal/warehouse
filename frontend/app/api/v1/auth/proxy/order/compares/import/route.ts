import { handleOrderCompareImportPost } from "@/lib/bff-order-compare-handlers";

export async function POST(request: Request) {
  return handleOrderCompareImportPost(request);
}
