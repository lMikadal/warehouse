import {
  handleMemberTierDelete,
  handleMemberTierGet,
  handleMemberTierPatch,
} from "@/lib/bff-member-tier-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberTierGet(request, id);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberTierPatch(request, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberTierDelete(request, id);
}
