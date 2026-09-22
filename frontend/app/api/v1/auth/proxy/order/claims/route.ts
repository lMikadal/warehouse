import { handleClaimListGet } from "@/lib/bff-order-claim-handlers";

export async function GET(request: Request) {
  return handleClaimListGet(request);
}
