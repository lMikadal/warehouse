import {
  handleWarehouseCreate,
  handleWarehouseListGet,
} from "@/lib/bff-warehouse-handlers";

export async function GET(request: Request) {
  return handleWarehouseListGet(request);
}

export async function POST(request: Request) {
  return handleWarehouseCreate(request);
}
