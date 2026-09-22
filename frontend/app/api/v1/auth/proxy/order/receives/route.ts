import { handleReceiveListGet } from "@/lib/bff-order-receive-handlers";

export async function GET(request: Request) {
  return handleReceiveListGet(request);
}
