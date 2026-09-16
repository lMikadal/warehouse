import {
  handleSupplierUserCreate,
  handleSupplierUsersListGet,
} from "@/lib/bff-supplier-handlers";

export async function GET(request: Request) {
  return handleSupplierUsersListGet(request);
}

export async function POST(request: Request) {
  return handleSupplierUserCreate(request);
}
