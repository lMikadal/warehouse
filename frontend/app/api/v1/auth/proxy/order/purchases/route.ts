import {
  handlePurchaseCreate,
  handlePurchaseListGet,
} from "@/lib/bff-order-purchase-handlers";

export async function GET(request: Request) {
  return handlePurchaseListGet(request);
}

export async function POST(request: Request) {
  return handlePurchaseCreate(request);
}
