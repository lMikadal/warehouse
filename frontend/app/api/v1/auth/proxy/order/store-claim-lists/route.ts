import { handleStoreClaimListGet } from "@/lib/bff-order-store-claim-handlers";

export async function GET(request: Request) {
  return handleStoreClaimListGet(request);
}
