import {
  handlePickingCreate,
  handlePickingListGet,
} from "@/lib/bff-order-picking-handlers";

export async function GET(request: Request) {
  return handlePickingListGet(request);
}

export async function POST(request: Request) {
  return handlePickingCreate(request);
}
