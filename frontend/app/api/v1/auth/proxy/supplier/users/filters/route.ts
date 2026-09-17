import { handleSupplierUserFiltersGet } from "@/lib/bff-supplier-handlers";

export async function GET(request: Request) {
  return handleSupplierUserFiltersGet(request);
}
