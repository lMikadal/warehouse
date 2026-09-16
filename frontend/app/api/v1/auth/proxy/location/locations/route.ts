import {
  handleLocationCreate,
  handleLocationListGet,
} from "@/lib/bff-location-handlers";

export async function GET(request: Request) {
  return handleLocationListGet(request);
}

export async function POST(request: Request) {
  return handleLocationCreate(request);
}
