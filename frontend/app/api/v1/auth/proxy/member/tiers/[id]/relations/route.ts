import { handleMemberTierRelationCreate } from "@/lib/bff-member-tier-handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberTierRelationCreate(request, id);
}
