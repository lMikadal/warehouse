import { handleSettingVatPatch } from "@/lib/bff-setting-handlers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingVatPatch(request, id);
}
