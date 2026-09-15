import { handleSystemGeoFiltersGet } from "@/lib/bff-system-geo-handlers";

const RESOURCE = "sub-districts" as const;

export async function GET(request: Request) {
  return handleSystemGeoFiltersGet(request, RESOURCE);
}
