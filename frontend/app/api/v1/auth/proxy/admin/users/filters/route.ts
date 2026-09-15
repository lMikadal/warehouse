import { handleAdminUserFiltersGet } from "@/lib/bff-admin-handlers";

export async function GET(request: Request) {
  return handleAdminUserFiltersGet(request);
}
