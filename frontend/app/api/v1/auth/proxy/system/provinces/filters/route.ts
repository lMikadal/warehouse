import { handleSystemGeoFiltersGet } from "@/lib/bff-system-geo-handlers";

const RESOURCE = "provinces" as const;

export async function GET(request: Request) {
  return handleSystemGeoFiltersGet(request, RESOURCE);
}
