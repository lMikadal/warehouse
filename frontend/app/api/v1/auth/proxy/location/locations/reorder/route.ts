import { handleLocationReorder } from "@/lib/bff-location-handlers";

export async function PATCH(request: Request) {
  return handleLocationReorder(request);
}
