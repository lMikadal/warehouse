import { handleReceiveCountGet } from "@/lib/bff-order-receive-handlers";

export async function GET(request: Request) {
  return handleReceiveCountGet(request);
}
