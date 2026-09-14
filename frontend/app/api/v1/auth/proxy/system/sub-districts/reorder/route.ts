import { handleSystemGeoReorder } from "@/lib/bff-system-geo-handlers";

const RESOURCE = "sub-districts" as const;

export async function PATCH(request: Request) {
  return handleSystemGeoReorder(request, RESOURCE);
}
