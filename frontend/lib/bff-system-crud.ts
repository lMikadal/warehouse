import { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";

const invalidBodyJson = (): NextResponse =>
  NextResponse.json(
    { code: "invalid_request", message: "invalid body" },
    { status: 400 }
  );

export async function readJsonBody(
  request: Request
): Promise<
  { ok: true; body: unknown } | { ok: false; response: NextResponse }
> {
  try {
    const body = await request.json();
    return { ok: true, body };
  } catch {
    return { ok: false, response: invalidBodyJson() };
  }
}

export async function proxyListGet(
  request: Request,
  backendBasePath: string
): Promise<NextResponse> {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `${backendBasePath}?${qs}` : backendBasePath;
  return proxyAuthedBackendJson(request, path);
}

export type SystemCrudHandlers = {
  listGet: (request: Request) => Promise<NextResponse>;
  create: (request: Request) => Promise<NextResponse>;
  getById: (request: Request, id: string) => Promise<NextResponse>;
  patchById: (request: Request, id: string) => Promise<NextResponse>;
  deleteById: (request: Request, id: string) => Promise<NextResponse>;
  reorder: (request: Request) => Promise<NextResponse>;
};

export function createSystemCrudHandlers(
  backendBasePath: string
): SystemCrudHandlers {
  return {
    listGet: (request) => proxyListGet(request, backendBasePath),
    create: async (request) => {
      const parsed = await readJsonBody(request);
      if (!parsed.ok) return parsed.response;
      return proxyAuthedBackendJson(request, backendBasePath, {
        method: "POST",
        body: parsed.body,
      });
    },
    getById: (request, id) =>
      proxyAuthedBackendJson(request, `${backendBasePath}/${id}`),
    patchById: async (request, id) => {
      const parsed = await readJsonBody(request);
      if (!parsed.ok) return parsed.response;
      return proxyAuthedBackendJson(request, `${backendBasePath}/${id}`, {
        method: "PATCH",
        body: parsed.body,
      });
    },
    deleteById: (request, id) =>
      proxyAuthedBackendJson(request, `${backendBasePath}/${id}`, {
        method: "DELETE",
      }),
    reorder: async (request) => {
      const parsed = await readJsonBody(request);
      if (!parsed.ok) return parsed.response;
      return proxyAuthedBackendJson(request, `${backendBasePath}/reorder`, {
        method: "PATCH",
        body: parsed.body,
      });
    },
  };
}
