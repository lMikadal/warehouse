import {
  handleSystemGeoCreate,
  handleSystemGeoListGet,
} from "@/lib/bff-system-geo-handlers";

const RESOURCE = "provinces" as const;

export async function GET(request: Request) {
  return handleSystemGeoListGet(request, RESOURCE);
}

export async function POST(request: Request) {
  return handleSystemGeoCreate(request, RESOURCE);
}
