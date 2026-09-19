import {
  handleMemberTierRelationDelete,
  handleMemberTierRelationPatch,
} from "@/lib/bff-member-tier-handlers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; relationId: string }> }
) {
  const { id, relationId } = await context.params;
  return handleMemberTierRelationPatch(request, id, relationId);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; relationId: string }> }
) {
  const { id, relationId } = await context.params;
  return handleMemberTierRelationDelete(request, id, relationId);
}
