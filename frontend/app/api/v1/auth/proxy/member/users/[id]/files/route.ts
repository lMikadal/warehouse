import { handleMemberUserFileCreate } from "@/lib/bff-member-user-handlers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handleMemberUserFileCreate(request, id);
}
