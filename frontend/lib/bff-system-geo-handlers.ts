import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import type { GeoResource } from "@/lib/system-geo-api";

function backendPath(resource: GeoResource, suffix = ""): string {
  return `/v1/system/${resource}${suffix}`;
}

export async function handleSystemGeoListGet(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `${backendPath(resource)}?${qs}`
    : backendPath(resource);
  return proxyAuthedBackendJson(request, path);
}

export async function handleSystemGeoCreate(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, backendPath(resource), {
    method: "POST",
    body,
  });
}

export async function handleSystemGeoGet(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${backendPath(resource)}/${id}`);
}

export async function handleSystemGeoPatch(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, `${backendPath(resource)}/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function handleSystemGeoDelete(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  return proxyAuthedBackendJson(request, `${backendPath(resource)}/${id}`, {
    method: "DELETE",
  });
}

export async function handleSystemGeoReorder(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  return proxyAuthedBackendJson(request, `${backendPath(resource)}/reorder`, {
    method: "PATCH",
    body,
  });
}
