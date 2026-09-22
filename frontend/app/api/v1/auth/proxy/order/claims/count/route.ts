import { handleClaimCountGet } from "@/lib/bff-order-claim-handlers";

export async function GET(request: Request) {
  return handleClaimCountGet(request);
}
