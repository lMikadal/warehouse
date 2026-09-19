import { handleMemberUserFileReorder } from "@/lib/bff-member-user-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleMemberUserFileReorder(request, id);
}
