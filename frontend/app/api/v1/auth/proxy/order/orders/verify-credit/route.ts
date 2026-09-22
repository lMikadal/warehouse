import { handlePickingVerifyCredit } from "@/lib/bff-order-picking-handlers";

export async function POST(request: Request) {
  return handlePickingVerifyCredit(request);
}
