import { handleSystemPermissionsListGet } from "@/lib/bff-system-permission-handlers";

export async function GET(request: Request) {
  return handleSystemPermissionsListGet(request);
}
