import type { NextResponse } from "next/server";

import { createSystemCrudHandlers } from "@/lib/bff-system-crud";

const BASE = "/v1/location/locations";

const crud = createSystemCrudHandlers(BASE);

export async function handleLocationListGet(
  request: Request
): Promise<NextResponse> {
  return crud.listGet(request);
}

export async function handleLocationCreate(
  request: Request
): Promise<NextResponse> {
  return crud.create(request);
}

export async function handleLocationGet(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.getById(request, id);
}

export async function handleLocationPatch(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.patchById(request, id);
}

export async function handleLocationDelete(
  request: Request,
  id: string
): Promise<NextResponse> {
  return crud.deleteById(request, id);
}

export async function handleLocationReorder(
  request: Request
): Promise<NextResponse> {
  return crud.reorder(request);
}
