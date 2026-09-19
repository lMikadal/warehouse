import { handleMemberUserFileDelete } from "@/lib/bff-member-user-handlers";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  const { id, fileId } = await ctx.params;
  return handleMemberUserFileDelete(request, id, fileId);
}
