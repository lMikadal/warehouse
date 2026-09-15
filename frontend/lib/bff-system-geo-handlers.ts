import type { NextResponse } from "next/server";

import {
  createSystemCrudHandlers,
  proxyListGet,
} from "@/lib/bff-system-crud";
import type { GeoResource } from "@/lib/system-geo-api";

function geoCrud(resource: GeoResource) {
  return createSystemCrudHandlers(`/v1/system/${resource}`);
}

export async function handleSystemGeoListGet(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  return geoCrud(resource).listGet(request);
}

export async function handleSystemGeoFiltersGet(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  return proxyListGet(request, `/v1/system/${resource}/filters`);
}

export async function handleSystemGeoCreate(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  return geoCrud(resource).create(request);
}

export async function handleSystemGeoGet(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  return geoCrud(resource).getById(request, id);
}

export async function handleSystemGeoPatch(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  return geoCrud(resource).patchById(request, id);
}

export async function handleSystemGeoDelete(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  return geoCrud(resource).deleteById(request, id);
}

export async function handleSystemGeoReorder(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  return geoCrud(resource).reorder(request);
}
