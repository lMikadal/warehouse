import { handleSystemMenuMove } from "@/lib/bff-system-menu-handlers";

export async function PATCH(request: Request) {
  return handleSystemMenuMove(request);
}
