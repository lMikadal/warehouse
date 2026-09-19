import {
  handleMemberUserDelete,
  handleMemberUserGet,
  handleMemberUserPatch,
} from "@/lib/bff-member-user-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleMemberUserGet(request, id);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleMemberUserPatch(request, id);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleMemberUserDelete(request, id);
}
