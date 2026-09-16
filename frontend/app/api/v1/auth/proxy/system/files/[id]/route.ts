import { proxyAuthedBackendJson } from "@/lib/bff-backend";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyAuthedBackendJson(request, `system/files/${id}`);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyAuthedBackendJson(request, `system/files/${id}`, {
    method: "DELETE",
  });
}
