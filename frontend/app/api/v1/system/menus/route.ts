import { handleSystemMenusListGet } from "@/lib/bff-system-menu-handlers";

export async function GET(request: Request) {
  return handleSystemMenusListGet(request);
}
