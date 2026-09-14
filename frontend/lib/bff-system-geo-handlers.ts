import { NextResponse } from "next/server";

import {
  accessTokenOrUnauthorized,
  authedBackendFetch,
  localeFromRequest,
  proxyErrorJson,
  proxyJsonResponse,
} from "@/lib/bff-backend";
import type { GeoResource } from "@/lib/system-geo-api";

function backendPath(resource: GeoResource, suffix = ""): string {
  return `/v1/system/${resource}${suffix}`;
}

export async function handleSystemGeoListGet(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs
    ? `${backendPath(resource)}?${qs}`
    : backendPath(resource);

  const res = await authedBackendFetch(path, {
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemGeoCreate(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const res = await authedBackendFetch(backendPath(resource), {
    method: "POST",
    body,
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemGeoGet(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const res = await authedBackendFetch(`${backendPath(resource)}/${id}`, {
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemGeoPatch(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const res = await authedBackendFetch(`${backendPath(resource)}/${id}`, {
    method: "PATCH",
    body,
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemGeoDelete(
  request: Request,
  resource: GeoResource,
  id: string
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  const res = await authedBackendFetch(`${backendPath(resource)}/${id}`, {
    method: "DELETE",
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}

export async function handleSystemGeoReorder(
  request: Request,
  resource: GeoResource
): Promise<NextResponse> {
  const auth = await accessTokenOrUnauthorized();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_request", message: "invalid body" },
      { status: 400 }
    );
  }

  const res = await authedBackendFetch(`${backendPath(resource)}/reorder`, {
    method: "PATCH",
    body,
    locale: localeFromRequest(request),
    token: auth.token,
  });

  if (!res.ok) return proxyErrorJson(res);
  return proxyJsonResponse(res);
}
