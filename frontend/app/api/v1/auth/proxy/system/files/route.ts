import { proxyAuthedBackendForm } from "@/lib/bff-backend";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { code: "invalid_request", message: "invalid form" },
      { status: 400 }
    );
  }
  return proxyAuthedBackendForm(request, "system/files", { method: "POST", body: form });
}
