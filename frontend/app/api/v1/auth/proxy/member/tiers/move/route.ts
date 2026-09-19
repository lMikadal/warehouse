import { handleMemberTierMove } from "@/lib/bff-member-tier-handlers";

export async function PATCH(request: Request) {
  return handleMemberTierMove(request);
}
