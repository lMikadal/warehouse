import { handleStoreSalesFiltersGet } from "@/lib/bff-order-store-handlers";

export async function GET(request: Request) {
  return handleStoreSalesFiltersGet(request);
}
