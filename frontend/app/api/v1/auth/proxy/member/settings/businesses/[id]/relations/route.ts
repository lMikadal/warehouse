import { handleMemberBusinessRelationsGet } from "@/lib/bff-member-setting-handlers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleMemberBusinessRelationsGet(request, id);
}
