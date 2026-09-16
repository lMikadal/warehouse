import type { NextResponse } from "next/server";

import { proxyAuthedBackendJson } from "@/lib/bff-backend";
import { readJsonBody } from "@/lib/bff-system-crud";

export async function proxyNestedMutate(
  request: Request,
  path: string,
  method: "POST" | "PATCH" | "DELETE"
): Promise<NextResponse> {
  if (method === "DELETE") {
    return proxyAuthedBackendJson(request, path, { method: "DELETE" });
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyAuthedBackendJson(request, path, {
    method,
    body: parsed.body,
  });
}
