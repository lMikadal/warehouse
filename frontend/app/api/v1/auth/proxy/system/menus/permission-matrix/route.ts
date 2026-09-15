import { handleSystemMenuPermissionMatrixGet } from "@/lib/bff-system-menu-matrix-handlers";

export async function GET(request: Request) {
  return handleSystemMenuPermissionMatrixGet(request);
}
