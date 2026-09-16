import {
  handleSettingLangDelete,
  handleSettingLangGet,
  handleSettingLangPatch,
} from "@/lib/bff-setting-handlers";

const SEGMENT = "prefixes" as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingLangGet(request, SEGMENT, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingLangPatch(request, SEGMENT, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleSettingLangDelete(request, SEGMENT, id);
}
