import {
  handleMemberRelationDelete,
  handleMemberRelationPatch,
} from "@/lib/bff-member-setting-handlers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberRelationPatch(request, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberRelationDelete(request, id);
}
