import {
  handleStoreSalesCreate,
  handleStoreSalesListGet,
} from "@/lib/bff-order-store-handlers";

export async function GET(request: Request) {
  return handleStoreSalesListGet(request);
}

export async function POST(request: Request) {
  return handleStoreSalesCreate(request);
}
