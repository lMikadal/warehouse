import {
  handleMemberSettingDelete,
  handleMemberSettingGet,
  handleMemberSettingPatch,
} from "@/lib/bff-member-setting-handlers";

const SEGMENT = "businesses" as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberSettingGet(request, SEGMENT, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberSettingPatch(request, SEGMENT, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberSettingDelete(request, SEGMENT, id);
}
