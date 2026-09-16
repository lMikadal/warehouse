import {
  handleSettingCodeDelete,
  handleSettingCodeGet,
  handleSettingCodePatch,
} from "@/lib/bff-setting-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingCodeGet(request, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingCodePatch(request, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingCodeDelete(request, id);
}
